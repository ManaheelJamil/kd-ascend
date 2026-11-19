/** Placeholder until job applications are stored in Firestore. */

import { eventSlotOverlaps } from './jobSchedule';
import { getAllJobs, getJob, type Job } from './jobs';

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
};

type SeedRow = Omit<JobApplication, 'id'>;

const APPLICATIONS_BY_JOB: Record<string, SeedRow[]> = {
  'job-1': [
    {
      userUid: '',
      uid: 'UID8',
      name: 'John Doe',
      email: 'john.doe@gmail.com',
      phone: '+65 9123 4567',
      status: 'pending',
      doneBefore: '03',
    },
    {
      userUid: '',
      uid: 'UID1',
      name: 'Sarah Johnson',
      email: 'sarah.j@gmail.com',
      phone: '+65 9234 5678',
      status: 'rejected',
      doneBefore: '03',
    },
    {
      userUid: '',
      uid: 'UID3',
      name: 'Emily Davis',
      email: 'emily.davis@gmail.com',
      phone: '+65 9345 6789',
      status: 'approved',
      doneBefore: '00',
    },
  ],
  'job-2': [
    {
      userUid: '',
      uid: 'UID2',
      name: 'Michael Chen',
      email: 'michael.chen@gmail.com',
      phone: '+65 8111 2233',
      status: 'pending',
      doneBefore: '01',
    },
    {
      userUid: '',
      uid: 'UID5',
      name: 'Priya Nair',
      email: 'priya.nair@gmail.com',
      phone: '+65 8222 3344',
      status: 'pending',
      doneBefore: '05',
    },
    {
      userUid: '',
      uid: 'UID9',
      name: 'Alex Tan',
      email: 'alex.tan@gmail.com',
      phone: '+65 8333 4455',
      status: 'cancelled',
      doneBefore: '02',
      cancelledAt: '2026-02-19T22:00:00.000Z',
    },
    {
      userUid: '',
      uid: 'UID4',
      name: 'Lisa Wong',
      email: 'lisa.wong@gmail.com',
      phone: '+65 8444 5566',
      status: 'approved',
      doneBefore: '04',
    },
  ],
  'job-3': [
    {
      userUid: '',
      uid: 'UID6',
      name: 'David Lim',
      email: 'david.lim@gmail.com',
      phone: '+65 8555 6677',
      status: 'approved',
      doneBefore: '06',
    },
    {
      userUid: '',
      uid: 'UID7',
      name: 'Nur Aisha',
      email: 'nur.aisha@gmail.com',
      phone: '+65 8666 7788',
      status: 'approved',
      doneBefore: '03',
    },
    {
      userUid: '',
      uid: 'UID0',
      name: 'Ryan Koh',
      email: 'ryan.koh@gmail.com',
      phone: '+65 8777 8899',
      status: 'approved',
      doneBefore: '01',
    },
    {
      userUid: '',
      uid: 'UID11',
      name: 'Grace Ho',
      email: 'grace.ho@gmail.com',
      phone: '+65 8888 9900',
      status: 'rejected',
      doneBefore: '00',
    },
    {
      userUid: '',
      uid: 'UID12',
      name: 'Tommy Ang',
      email: 'tommy.ang@gmail.com',
      phone: '+65 8999 0011',
      status: 'approved',
      doneBefore: '02',
    },
    {
      userUid: '',
      uid: 'UID13',
      name: 'Mei Lin',
      email: 'mei.lin@gmail.com',
      phone: '+65 9000 1122',
      status: 'approved',
      doneBefore: '07',
    },
  ],
  'job-4': [
    {
      userUid: '',
      uid: 'UID14',
      name: 'James Lee',
      email: 'james.lee@gmail.com',
      phone: '+65 9111 2233',
      status: 'pending',
      doneBefore: '00',
    },
  ],
  'job-5': [
    {
      userUid: '',
      uid: 'UID15',
      name: 'Sophie Ng',
      email: 'sophie.ng@gmail.com',
      phone: '+65 9222 3344',
      status: 'approved',
      doneBefore: '08',
    },
    {
      userUid: '',
      uid: 'UID16',
      name: 'Hassan Ali',
      email: 'hassan.ali@gmail.com',
      phone: '+65 9333 4455',
      status: 'approved',
      doneBefore: '12',
    },
    {
      userUid: '',
      uid: 'UID17',
      name: 'Yuki Sato',
      email: 'yuki.sato@gmail.com',
      phone: '+65 9444 5566',
      status: 'approved',
      doneBefore: '04',
    },
  ],
};

function seedForJob(jobId: string): JobApplication[] {
  const rows = APPLICATIONS_BY_JOB[jobId] ?? [];
  return rows.map((row, i) => ({ ...row, id: `${jobId}-app-${i + 1}` }));
}

const byJob = new Map<string, JobApplication[]>(
  Object.keys(APPLICATIONS_BY_JOB).map((jobId) => [jobId, seedForJob(jobId)]),
);

export function getJobApplications(jobId: string): JobApplication[] {
  if (!byJob.has(jobId)) {
    byJob.set(jobId, []);
  }
  return [...(byJob.get(jobId) ?? [])];
}

/** Jobs where this user appears on the application list (mobile apply or admin add). */
export function getJobsForApplicantUser(userUid: string, email?: string): Job[] {
  const emailNorm = email?.trim().toLowerCase() ?? '';
  const jobs: Job[] = [];
  for (const job of getAllJobs()) {
    const apps = getJobApplications(job.id);
    const onList = apps.some(
      (a) =>
        (userUid && a.userUid === userUid) ||
        (emailNorm && a.email.trim().toLowerCase() === emailNorm),
    );
    if (onList) jobs.push(job);
  }
  return jobs;
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
  for (const other of getAllJobs()) {
    if (other.id === targetJob.id) continue;
    if (!eventSlotOverlaps(targetJob.eventDate, targetJob.eventTime, other.eventDate, other.eventTime)) continue;
    const apps = getJobApplications(other.id);
    const hit = apps.find((a) => a.userUid === userUid && activeStatuses.includes(a.status));
    if (hit) return { jobId: other.id, title: other.title, jobIdLabel: other.jobId };
  }
  return null;
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
  const list = getJobApplications(job.id);
  if (alreadyOnJob(list, user)) {
    throw new Error('This user is already on this job.');
  }
  const conflict = findApplicationTimeConflict(user.userUid, job);
  if (conflict) {
    throw new Error(`Time conflict with ${conflict.title} (${conflict.jobIdLabel}) on the same date and hours.`);
  }
  const id = `${job.id}-app-${Date.now()}`;
  byJob.set(job.id, [
    ...list,
    {
      id,
      userUid: user.userUid,
      uid: user.uid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: 'pending',
      doneBefore: '00',
    },
  ]);
}

export async function setApplicationStatus(
  jobId: string,
  applicationId: string,
  status: ApplicationStatus,
): Promise<void> {
  const list = getJobApplications(jobId);
  byJob.set(
    jobId,
    list.map((a) => (a.id === applicationId ? { ...a, status } : a)),
  );
}

export async function removeJobApplication(jobId: string, applicationId: string): Promise<void> {
  const list = getJobApplications(jobId);
  const next = list.filter((a) => a.id !== applicationId);
  if (next.length === list.length) {
    throw new Error('Application not found.');
  }
  byJob.set(jobId, next);
}

/** Member cancelled from the app; late cancel (under 24h before shift) creates a penalty row in payments. */
export async function cancelJobApplication(
  jobId: string,
  applicationId: string,
  cancelledAt: Date = new Date(),
): Promise<void> {
  const list = getJobApplications(jobId);
  const app = list.find((a) => a.id === applicationId);
  if (!app) throw new Error('Application not found.');
  if (app.status === 'cancelled') return;
  const cancelledAtIso = cancelledAt.toISOString();
  const next = list.map((a) =>
    a.id === applicationId ? { ...a, status: 'cancelled' as const, cancelledAt: cancelledAtIso } : a,
  );
  byJob.set(jobId, next);
  const job = getJob(jobId);
  if (job) {
    const updated = next.find((a) => a.id === applicationId)!;
    const { ensureLateCancelPenalty } = await import('./payments');
    await ensureLateCancelPenalty(job, updated);
  }
}