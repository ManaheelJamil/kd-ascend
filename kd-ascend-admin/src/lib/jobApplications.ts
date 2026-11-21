/**
 * Job applications, stored in Firestore: jobs/{jobId}/applications/{applicationId}.
 * One collection-group listener keeps every job's list live (admin dashboard only).
 */

import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { eventSlotOverlaps } from './jobSchedule';
import { getAllJobs, getJob, jobsReady, type Job } from './jobs';
import { liveStore, withoutUndefined } from './live';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export function applicationStatusLabel(status: ApplicationStatus): string {
  if (status === 'pending') return 'Pending';
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Cancelled';
}

export type JobApplication = {
  id: string;
  /** Firestore user id when added from admin; empty for legacy seed rows. */
  userUid: string;
  /** Display code in table (member id or short uid). */
  uid: string;
  name: string;
  email: string;
  phone: string;
  status: ApplicationStatus;
  doneBefore: string;
  /** When the member cancelled from the app (ISO). Used for late-cancel penalty. */
  cancelledAt?: string;
  /** Parent job (jobs/{jobId}). */
  jobId?: string;
  addedAt?: Timestamp | null;
  addedBy?: string;
};

const adminId = () => auth.currentUser?.email ?? auth.currentUser?.uid ?? 'admin';
const appsCol = (jobId: string) => collection(db, 'jobs', jobId, 'applications');
const appRef = (jobId: string, applicationId: string) => doc(db, 'jobs', jobId, 'applications', applicationId);
const millis = (t?: Timestamp | null) => (t && typeof t.toMillis === 'function' ? t.toMillis() : Number.MAX_SAFE_INTEGER);

/** Every application of every job, grouped by job id, oldest first. */
const appsStore = liveStore<Map<string, JobApplication[]>>(new Map(), (set, fail) =>
  onSnapshot(
    collectionGroup(db, 'applications'),
    (snap) => {
      const byJob = new Map<string, JobApplication[]>();
      snap.docs.forEach((d) => {
        const jobId = d.ref.parent.parent?.id;
        if (!jobId) return;
        const a = d.data() as Omit<JobApplication, 'id'> & { cancelledAtServer?: Timestamp | null };
        // Cancels from the mobile app carry a server timestamp (the app's own clock can't be trusted
        // for the 24-hour late-cancel penalty).
        const serverCancel =
          a.cancelledAtServer && typeof a.cancelledAtServer.toDate === 'function'
            ? a.cancelledAtServer.toDate().toISOString()
            : undefined;
        const row: JobApplication = {
          ...a,
          cancelledAt: serverCancel ?? a.cancelledAt,
          id: d.id,
          jobId,
          userUid: a.userUid ?? '',
          uid: a.uid ?? '',
          name: a.name ?? '',
          email: a.email ?? '',
          phone: a.phone ?? '',
          doneBefore: a.doneBefore ?? '00',
        };
        byJob.set(jobId, [...(byJob.get(jobId) ?? []), row]);
      });
      byJob.forEach((list) => list.sort((x, y) => millis(x.addedAt) - millis(y.addedAt)));
      set(byJob);
      scheduleApprovedCountSync();
    },
    (e) => fail(e),
  ),
);

/**
 * Members can't read other people's applications, so each job carries `approvedCount`
 * (the mobile app shows "N slots left" from it). Whenever applications change, the dashboard
 * writes the new count on the jobs where it differs.
 */
let countSyncTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleApprovedCountSync() {
  if (countSyncTimer) clearTimeout(countSyncTimer);
  countSyncTimer = setTimeout(() => {
    countSyncTimer = null;
    void syncApprovedCounts();
  }, 800);
}
async function syncApprovedCounts() {
  try {
    await jobsReady();
    const byJob = appsStore.get();
    for (const job of getAllJobs()) {
      const approved = (byJob.get(job.id) ?? []).filter((a) => a.status === 'approved').length;
      if ((job.approvedCount ?? 0) === approved && job.approvedCount !== undefined) continue;
      await updateDoc(doc(db, 'jobs', job.id), { approvedCount: approved }).catch(() => undefined);
    }
  } catch {
    // Not signed in yet: the next snapshot tries again.
  }
}

/** Resolves once applications (and jobs) have loaded. */
export async function applicationsReady(): Promise<void> {
  await Promise.all([appsStore.ready(), jobsReady()]);
}

export function getJobApplications(jobId: string): JobApplication[] {
  return [...(appsStore.get().get(jobId) ?? [])];
}

/** One job's applications, live. */
export function subscribeJobApplications(
  jobId: string,
  onData: (list: JobApplication[]) => void,
  onError?: (e: Error) => void,
): () => void {
  return appsStore.subscribe((map) => onData([...(map.get(jobId) ?? [])]), onError);
}

/** Every application, live (e.g. a user's job history). */
export function subscribeAllApplications(
  onData: (byJob: Map<string, JobApplication[]>) => void,
  onError?: (e: Error) => void,
): () => void {
  return appsStore.subscribe(onData, onError);
}

/** Jobs where this user appears on the application list (mobile apply or admin add). */
export function getJobsForApplicantUser(userUid: string, email?: string): Job[] {
  const emailNorm = email?.trim().toLowerCase() ?? '';
  return getAllJobs().filter((job) =>
    getJobApplications(job.id).some(
      (a) => (userUid && a.userUid === userUid) || (emailNorm && a.email.trim().toLowerCase() === emailNorm),
    ),
  );
}

export function applicationStats(jobId: string): { total: number; pending: number } {
  const list = getJobApplications(jobId);
  return { total: list.length, pending: list.filter((a) => a.status === 'pending').length };
}

const activeStatuses: ApplicationStatus[] = ['pending', 'approved'];

export function findApplicationTimeConflict(
  userUid: string,
  targetJob: Job,
): { jobId: string; title: string; jobIdLabel: string } | null {
  if (!userUid) return null;
  for (const other of getAllJobs()) {
    if (other.id === targetJob.id) continue;
    if (other.status === 'cancelled') continue;
    if (!eventSlotOverlaps(targetJob.eventDate, targetJob.eventTime, other.eventDate, other.eventTime)) continue;
    const hit = getJobApplications(other.id).find((a) => a.userUid === userUid && activeStatuses.includes(a.status));
    if (hit) return { jobId: other.id, title: other.title, jobIdLabel: other.jobId };
  }
  return null;
}

/** How many jobs this user has completed before: approved on a closed job. */
export function jobsDoneBefore(userUid: string, email = ''): number {
  const emailNorm = email.trim().toLowerCase();
  let n = 0;
  for (const job of getAllJobs()) {
    if (job.status !== 'closed') continue;
    if (
      getJobApplications(job.id).some(
        (a) =>
          a.status === 'approved' &&
          ((userUid && a.userUid === userUid) || (emailNorm && a.email.trim().toLowerCase() === emailNorm)),
      )
    )
      n += 1;
  }
  return n;
}

export type AddApplicantInput = {
  userUid: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
};

function alreadyOnJob(list: JobApplication[], user: AddApplicantInput): boolean {
  const email = user.email.trim().toLowerCase();
  const code = user.uid.trim().toLowerCase();
  return list.some(
    (a) =>
      (user.userUid && a.userUid === user.userUid) ||
      (email && a.email.trim().toLowerCase() === email) ||
      (code && a.uid.trim().toLowerCase() === code),
  );
}

export async function addJobApplication(job: Job, user: AddApplicantInput): Promise<void> {
  await applicationsReady();
  const fresh = getJob(job.id) ?? job;
  if (alreadyOnJob(getJobApplications(fresh.id), user)) {
    throw new Error('This user is already on this job.');
  }
  const conflict = findApplicationTimeConflict(user.userUid, fresh);
  if (conflict) {
    throw new Error(`Time conflict with ${conflict.title} (${conflict.jobIdLabel}) on the same date and hours.`);
  }
  await addDoc(
    appsCol(fresh.id),
    withoutUndefined({
      jobId: fresh.id,
      userUid: user.userUid,
      uid: user.uid,
      name: user.name,
      email: user.email.trim(),
      phone: user.phone,
      status: 'pending' as ApplicationStatus,
      doneBefore: String(jobsDoneBefore(user.userUid, user.email)).padStart(2, '0'),
      addedAt: serverTimestamp(),
      addedBy: adminId(),
    }),
  );
}

export async function setApplicationStatus(
  jobId: string,
  applicationId: string,
  status: ApplicationStatus,
): Promise<void> {
  await updateDoc(appRef(jobId, applicationId), {
    status,
    statusUpdatedAt: serverTimestamp(),
    statusUpdatedBy: adminId(),
  });
}

export async function removeJobApplication(jobId: string, applicationId: string): Promise<void> {
  await deleteDoc(appRef(jobId, applicationId));
}

/** Member cancelled from the app; late cancel (under 24h before shift) creates a penalty row in payments. */
export async function cancelJobApplication(
  jobId: string,
  applicationId: string,
  cancelledAt: Date = new Date(),
): Promise<void> {
  await applicationsReady();
  const app = getJobApplications(jobId).find((a) => a.id === applicationId);
  if (!app) throw new Error('Application not found.');
  if (app.status === 'cancelled') return;
  const cancelledAtIso = cancelledAt.toISOString();
  await updateDoc(appRef(jobId, applicationId), {
    status: 'cancelled',
    cancelledAt: cancelledAtIso,
    statusUpdatedAt: serverTimestamp(),
  });
  const job = getJob(jobId);
  if (job) {
    const { ensureLateCancelPenalty } = await import('./payments');
    await ensureLateCancelPenalty(job, { ...app, status: 'cancelled', cancelledAt: cancelledAtIso });
  }
}
