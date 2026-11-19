/**
 * Jobs, stored in Firestore: jobs/{jobId}. Applications live in jobs/{jobId}/applications
 * (see jobApplications.ts) and payments in paymentTransactions (see payments.ts).
 * One shared real-time listener keeps every screen up to date.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { liveStore, todayIso, withoutUndefined } from './live';

export type JobStatus = 'draft' | 'open' | 'filled' | 'closed' | 'cancelled';

export const JOB_STATUSES: { value: JobStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'filled', label: 'Filled' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function jobStatusLabel(status: JobStatus): string {
  return JOB_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export type JobInput = {
  corporateId: string;
  corporateName: string;
  title: string;
  location: string;
  description: string;
  salary: string;
  requirements: string[];
  eventDate: string;
  eventTime: string;
  slotsMale: string;
  slotsFemale: string;
};

export type Job = JobInput & {
  id: string;
  jobId: string;
  status: JobStatus;
  /** When the job was posted (yyyy-mm-dd). Falls back to event date in UI if omitted. */
  postedOn?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  createdBy?: string;
};

export function emptyJobInput(): JobInput {
  return {
    corporateId: '',
    corporateName: '',
    title: '',
    location: '',
    description: '',
    salary: '',
    requirements: [''],
    eventDate: '',
    eventTime: '',
    slotsMale: '',
    slotsFemale: '',
  };
}

export function jobToInput(job: Job): JobInput {
  return {
    corporateId: job.corporateId,
    corporateName: job.corporateName,
    title: job.title,
    location: job.location,
    description: job.description,
    salary: job.salary,
    requirements: job.requirements.length ? job.requirements : [''],
    eventDate: job.eventDate,
    eventTime: job.eventTime,
    slotsMale: job.slotsMale,
    slotsFemale: job.slotsFemale,
  };
}

const jobsCol = collection(db, 'jobs');
const jobRef = (id: string) => doc(db, 'jobs', id);
const adminId = () => auth.currentUser?.email ?? auth.currentUser?.uid ?? 'admin';

const millis = (t?: Timestamp | null) => (t && typeof t.toMillis === 'function' ? t.toMillis() : Number.MAX_SAFE_INTEGER);

/** Newest first; a job saved a moment ago (no server time yet) stays on top. */
const jobsStore = liveStore<Job[]>([], (set, fail) =>
  onSnapshot(
    jobsCol,
    (snap) =>
      set(
        snap.docs
          .map((d) => ({ ...(d.data() as Omit<Job, 'id'>), id: d.id }))
          .map((j) => ({ ...j, requirements: Array.isArray(j.requirements) ? j.requirements : [] }))
          .sort((a, b) => millis(b.createdAt) - millis(a.createdAt)),
      ),
    (e) => fail(e),
  ),
);

/** Resolves once the jobs list has loaded. */
export const jobsReady = () => jobsStore.ready();

export function getJob(id: string): Job | null {
  return jobsStore.get().find((j) => j.id === id) ?? null;
}

/** Waits for the first snapshot, then returns the job (null when it doesn't exist). */
export async function loadJob(id: string): Promise<Job | null> {
  await jobsStore.ready();
  return getJob(id);
}

export function getAllJobs(): Job[] {
  return [...jobsStore.get()];
}

export function subscribeJobs(onData: (list: Job[]) => void, onError: (e: Error) => void): () => void {
  return jobsStore.subscribe((list) => onData([...list]), onError);
}

/** One job, live: undefined while loading, null when it doesn't exist (or was deleted). */
export function subscribeJob(id: string, onData: (job: Job | null) => void, onError?: (e: Error) => void): () => void {
  return jobsStore.subscribe((list) => onData(list.find((j) => j.id === id) ?? null), onError);
}

/** JOB-1001, JOB-1002 … from counters/jobs (numbers are never reused). */
async function nextJobLabel(): Promise<string> {
  const counter = doc(db, 'counters', 'jobs');
  const n = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counter);
    let last = (snap.data()?.last as number | undefined) ?? 1000;
    // Never hand out a number that is already in use (e.g. jobs created before the counter).
    for (const j of jobsStore.get()) {
      const used = Number.parseInt(j.jobId.replace(/\D/g, ''), 10);
      if (Number.isFinite(used) && used > last) last = used;
    }
    tx.set(counter, { last: last + 1 }, { merge: true });
    return last + 1;
  });
  return `JOB-${n}`;
}

const cleanInput = (input: JobInput): JobInput => ({
  ...input,
  title: input.title.trim(),
  location: input.location.trim(),
  description: input.description.trim(),
  salary: input.salary.trim(),
  requirements: input.requirements.map((r) => r.trim()).filter(Boolean),
});

/**
 * Keeps corporates/{id}.activeJobs / completedJobs in step with its jobs
 * (open + filled = active, closed = completed). Shown on the Corporates screens.
 */
export async function syncCorporateJobCounts(corporateId: string): Promise<void> {
  if (!corporateId) return;
  try {
    const snap = await getDocs(query(jobsCol, where('corporateId', '==', corporateId)));
    let activeJobs = 0;
    let completedJobs = 0;
    snap.forEach((d) => {
      const s = (d.data() as Job).status;
      if (s === 'open' || s === 'filled') activeJobs += 1;
      else if (s === 'closed') completedJobs += 1;
    });
    await updateDoc(doc(db, 'corporates', corporateId), { activeJobs, completedJobs });
  } catch {
    // Counts are a convenience: never block the job change itself.
  }
}

export async function createJob(input: JobInput, status: JobStatus): Promise<string> {
  const jobId = await nextJobLabel();
  const res = await addDoc(
    jobsCol,
    withoutUndefined({
      ...cleanInput(input),
      jobId,
      status,
      postedOn: todayIso(),
      createdBy: adminId(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  void syncCorporateJobCounts(input.corporateId);
  return res.id;
}

export type JobStatusUpdateResult = { createdPayouts: number };

export function jobClosePayoutToast(baseMessage: string, createdPayouts: number): string {
  if (createdPayouts === 0) return `${baseMessage} No approved applicants — no payout drafts created.`;
  return `${baseMessage} Created ${createdPayouts} payout draft${createdPayouts === 1 ? '' : 's'}.`;
}

async function payoutsOnJobClose(job: Job): Promise<number> {
  try {
    const { createPayoutsForClosedJob } = await import('./payments');
    const ids = await createPayoutsForClosedJob(job);
    return ids.length;
  } catch {
    throw new Error('Job closed but payouts could not be created.');
  }
}

/** Status change that closes the job → draft payouts; if they can't be made, the old status comes back. */
async function afterStatusChange(prev: Job, next: Job): Promise<JobStatusUpdateResult> {
  if (next.status === 'closed' && prev.status !== 'closed') {
    try {
      const createdPayouts = await payoutsOnJobClose(next);
      return { createdPayouts };
    } catch (e) {
      await updateDoc(jobRef(prev.id), { status: prev.status, updatedAt: serverTimestamp() }).catch(() => undefined);
      throw e;
    }
  }
  return { createdPayouts: 0 };
}

export async function updateJob(id: string, input: JobInput, status: JobStatus): Promise<JobStatusUpdateResult> {
  const prev = await loadJob(id);
  if (!prev) throw new Error('Job not found.');
  const clean = cleanInput(input);
  await updateDoc(jobRef(id), withoutUndefined({ ...clean, status, updatedAt: serverTimestamp() }));
  const result = await afterStatusChange(prev, { ...prev, ...clean, status });
  void syncCorporateJobCounts(clean.corporateId);
  if (prev.corporateId && prev.corporateId !== clean.corporateId) void syncCorporateJobCounts(prev.corporateId);
  return result;
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<JobStatusUpdateResult> {
  const prev = await loadJob(id);
  if (!prev) throw new Error('Job not found.');
  await updateDoc(jobRef(id), { status, updatedAt: serverTimestamp() });
  const result = await afterStatusChange(prev, { ...prev, status });
  void syncCorporateJobCounts(prev.corporateId);
  return result;
}

/** Deletes the job and its applications. Payment records stay, as payment history. */
export async function deleteJob(id: string): Promise<void> {
  const prev = getJob(id);
  const apps = await getDocs(collection(db, 'jobs', id, 'applications'));
  const docs = apps.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(jobRef(id));
  if (prev?.corporateId) void syncCorporateJobCounts(prev.corporateId);
}
