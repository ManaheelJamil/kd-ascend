/**
 * Jobs module (mobile): browse open jobs, apply, see my bookings, cancel, see my earnings.
 * Same Firestore data the admin dashboard writes:
 *   jobs/{jobId}                               – posted by the admin
 *   jobs/{jobId}/applications/{uid}            – a member's application (doc id = their uid)
 *   corporates/{corporateId}/blacklistedUsers/{uid} – member hidden from that corporate's jobs
 *   paymentTransactions/{id}                   – payouts and late-cancel penalties (admin writes)
 * Everything is live (onSnapshot), so admin changes show up in the app straight away.
 * Security is enforced by firestore.rules; the checks here only give friendly messages.
 */
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { db } from '../firebase';
import type { UserDoc } from './userService';

export type JobStatus = 'draft' | 'open' | 'filled' | 'closed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type Job = {
  id: string;
  jobId: string;
  corporateId: string;
  corporateName: string;
  title: string;
  location: string;
  description: string;
  salary: string;
  requirements: string[];
  /** yyyy-mm-dd */
  eventDate: string;
  /** "9:00 AM - 5:00 PM" */
  eventTime: string;
  slotsMale: string;
  slotsFemale: string;
  status: JobStatus;
  postedOn?: string;
  /** Approved applicants (kept up to date by the admin dashboard). */
  approvedCount?: number;
  createdAtMs?: number;
  /** Last change by the admin (ms), e.g. when the job was cancelled. */
  updatedAtMs?: number;
};

export type JobApplication = {
  id: string;
  jobId: string;
  userUid: string;
  status: ApplicationStatus;
  cancelledAt?: string;
  addedAt?: { toMillis?: () => number } | null;
  /** When the application was made (ms). */
  addedAtMs?: number;
  /** Last approve / reject / cancel (ms). */
  statusUpdatedAtMs?: number;
};

const tsMs = (v: unknown): number | undefined =>
  v && typeof (v as { toMillis?: () => number }).toMillis === 'function'
    ? (v as { toMillis: () => number }).toMillis()
    : undefined;

export type PaymentTransaction = {
  id: string;
  txnId: string;
  type: 'payout' | 'penalty';
  status: 'draft' | 'pending' | 'completed' | 'failed';
  amount: number;
  jobId: string;
  jobIdLabel: string;
  method: string;
  note?: string;
  /** When the admin completed the payment (ms), if completed. */
  completedAtMs?: number;
  applicationId?: string;
  hourlyRate: number;
  adjustedHours: number;
  bonus: number;
  deduction: number;
  /** yyyy-mm-dd of the last status change (paid / deducted on). */
  lastUpdate?: string;
  createdAt?: { toMillis?: () => number } | null;
};

export const LATE_CANCEL_PENALTY = 50;
const LATE_CANCEL_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ time helpers */

function toMinutes(h: number, m: number, ap: string): number {
  let hour = h % 12;
  if (ap.toUpperCase() === 'PM') hour += 12;
  return hour * 60 + m;
}

export function parseEventTimeRange(eventTime: string): { startMin: number; endMin: number } | null {
  const m = (eventTime || '').trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  const startMin = toMinutes(Number(m[1]), Number(m[2]), m[3]);
  const endMin = toMinutes(Number(m[4]), Number(m[5]), m[6]);
  if (endMin <= startMin) return null;
  return { startMin, endMin };
}

function dateParts(eventDate: string): [number, number, number] | null {
  const p = (eventDate || '').split('-').map((x) => Number.parseInt(x, 10));
  if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return null;
  return [p[0], p[1], p[2]];
}

/** Shift start (local time). Without a readable time, the start of the event day. */
export function eventStartMs(job: Pick<Job, 'eventDate' | 'eventTime'>): number | null {
  const d = dateParts(job.eventDate);
  if (!d) return null;
  const r = parseEventTimeRange(job.eventTime);
  const min = r ? r.startMin : 0;
  return new Date(d[0], d[1] - 1, d[2], Math.floor(min / 60), min % 60).getTime();
}

/** Shift end (local time). Without a readable time, the end of the event day. */
export function eventEndMs(job: Pick<Job, 'eventDate' | 'eventTime'>): number | null {
  const d = dateParts(job.eventDate);
  if (!d) return null;
  const r = parseEventTimeRange(job.eventTime);
  const min = r ? r.endMin : 24 * 60 - 1;
  return new Date(d[0], d[1] - 1, d[2], Math.floor(min / 60), min % 60).getTime();
}

export function shiftHours(eventTime: string): number | null {
  const r = parseEventTimeRange(eventTime);
  return r ? Math.round(((r.endMin - r.startMin) / 60) * 10) / 10 : null;
}

function overlaps(a: Job, b: Job): boolean {
  if (!a.eventDate || a.eventDate !== b.eventDate) return false;
  const x = parseEventTimeRange(a.eventTime);
  const y = parseEventTimeRange(b.eventTime);
  if (!x || !y) return true;
  return x.startMin < y.endMin && y.startMin < x.endMin;
}

/** True when cancelling now would be within 24 hours of the shift start ($50 penalty). */
export function isLateCancel(job: Job, now = Date.now()): boolean {
  const start = eventStartMs(job);
  if (start == null || now >= start) return start != null;
  return start - now < LATE_CANCEL_MS;
}

/** "$20/hr" → 20 (first number in the salary text). */
export function hourlyRate(salary: string): number | null {
  const m = (salary || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2026-11-22" → "Sun, 22 Nov 2026". */
export function formatEventDate(eventDate: string): string {
  const d = dateParts(eventDate);
  if (!d) return eventDate || '—';
  const dt = new Date(d[0], d[1] - 1, d[2]);
  return `${DAYS[dt.getDay()]}, ${d[2]} ${MONTHS[d[1] - 1]} ${d[0]}`;
}

/** "2026-11-22" → { day: "22", month: "Nov" } for date badges. */
export function dateBadge(eventDate: string): { day: string; month: string } {
  const d = dateParts(eventDate);
  return d ? { day: String(d[2]), month: MONTHS[d[1] - 1] } : { day: '—', month: '' };
}

export function formatMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

/** Open slots: male + female slots minus approved applicants. `null` when the job sets no slots. */
export function slotsLeft(job: Job): number | null {
  const total = (Number.parseInt(job.slotsMale, 10) || 0) + (Number.parseInt(job.slotsFemale, 10) || 0);
  if (total <= 0) return null;
  return Math.max(0, total - (job.approvedCount ?? 0));
}

/** Which genders the job is for: both, or only one ("Female Only"). */
export function genders(job: Job): { male: boolean; female: boolean } {
  const m = (Number.parseInt(job.slotsMale, 10) || 0) > 0;
  const f = (Number.parseInt(job.slotsFemale, 10) || 0) > 0;
  return !m && !f ? { male: true, female: true } : { male: m, female: f };
}

/** "$12 / hour" style rate for cards; falls back to the salary text as typed by the admin. */
export function rateLabel(salary: string): { amount: string; unit: string } {
  const rate = hourlyRate(salary);
  if (rate == null) return { amount: salary || '—', unit: '' };
  const perHour = /hr|hour|\/h\b/i.test(salary) || !/day|shift|job|total/i.test(salary);
  return { amount: `$${rate % 1 === 0 ? rate : rate.toFixed(2)}`, unit: perHour ? ' / hour' : '' };
}

/** Expected pay for the whole shift: hourly rate × shift hours. */
export function expectedEarnings(job: Job): number | null {
  const rate = hourlyRate(job.salary);
  const hrs = shiftHours(job.eventTime);
  return rate != null && hrs != null ? Math.round(rate * hrs * 100) / 100 : null;
}

/** Booking reference shown on the booking page, e.g. "20260202_aS1v4". */
export function bookingCode(b: { job: Job; app: JobApplication }): string {
  return `${b.job.eventDate.replace(/-/g, '')}_${b.app.id.slice(0, 5)}`;
}

/** Time range as written in the design: "6:00 PM to 12:00 AM". */
export function timeLabel(eventTime: string): string {
  return (eventTime || '').replace(/\s*[–-]\s*/, ' to ') || '—';
}

/** "02 Feb 2026". */
export function shortDate(eventDate: string): string {
  const d = dateParts(eventDate);
  if (!d) return eventDate || '—';
  return `${String(d[2]).padStart(2, '0')} ${MONTHS[d[1] - 1]} ${d[0]}`;
}

/* ------------------------------------------------------------------ mapping */

function toJob(id: string, d: Record<string, unknown>): Job {
  const s = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : '');
  return {
    id,
    jobId: s('jobId'),
    corporateId: s('corporateId'),
    corporateName: s('corporateName'),
    title: s('title'),
    location: s('location'),
    description: s('description'),
    salary: s('salary'),
    requirements: Array.isArray(d.requirements) ? (d.requirements as unknown[]).map(String).filter(Boolean) : [],
    eventDate: s('eventDate'),
    eventTime: s('eventTime'),
    slotsMale: s('slotsMale'),
    slotsFemale: s('slotsFemale'),
    status: (s('status') || 'open') as JobStatus,
    postedOn: s('postedOn') || undefined,
    approvedCount: typeof d.approvedCount === 'number' ? d.approvedCount : undefined,
    createdAtMs:
      d.createdAt && typeof (d.createdAt as { toMillis?: () => number }).toMillis === 'function'
        ? (d.createdAt as { toMillis: () => number }).toMillis()
        : undefined,
    updatedAtMs:
      d.updatedAt && typeof (d.updatedAt as { toMillis?: () => number }).toMillis === 'function'
        ? (d.updatedAt as { toMillis: () => number }).toMillis()
        : undefined,
  };
}

/* ------------------------------------------------------------------ corporate blacklist */

const blockedCache = new Map<string, boolean>();

/** Whether this member is on the corporate's blacklist (cached for the session; rules enforce it anyway). */
async function isBlockedBy(corporateId: string, uid: string): Promise<boolean> {
  if (!corporateId) return false;
  const key = `${corporateId}/${uid}`;
  const hit = blockedCache.get(key);
  if (hit !== undefined) return hit;
  try {
    const snap = await getDoc(doc(db, 'corporates', corporateId, 'blacklistedUsers', uid));
    const blocked = snap.exists();
    blockedCache.set(key, blocked);
    return blocked;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ subscriptions */

/**
 * Open jobs a member can apply to, soonest first: status "open", shift not over yet,
 * and not from a corporate that has blacklisted this member.
 */
export function subscribeOpenJobs(
  uid: string,
  onData: (jobs: Job[]) => void,
  onError?: (e: Error) => void,
): () => void {
  let latest = 0;
  return onSnapshot(
    query(collection(db, 'jobs'), where('status', '==', 'open')),
    async (snap) => {
      const run = ++latest;
      const now = Date.now();
      const all = snap.docs
        .map((d) => toJob(d.id, d.data() as Record<string, unknown>))
        .filter((j) => (eventEndMs(j) ?? Number.MAX_SAFE_INTEGER) > now);
      const corporates = [...new Set<string>(all.map((j: Job) => j.corporateId))];
      const blocked = new Set<string>();
      await Promise.all(
        corporates.map(async (c) => {
          if (await isBlockedBy(c, uid)) blocked.add(c);
        }),
      );
      if (run !== latest) return;
      onData(
        all
          .filter((j) => !blocked.has(j.corporateId))
          .sort((a, b) => (eventStartMs(a) ?? 0) - (eventStartMs(b) ?? 0)),
      );
    },
    (e) => onError?.(e),
  );
}

/** One job, live. `null` once it no longer exists (or is back to draft). */
export function subscribeJob(
  jobId: string,
  onData: (job: Job | null) => void,
  onError?: (e: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'jobs', jobId),
    (snap) => onData(snap.exists() ? toJob(snap.id, snap.data() as Record<string, unknown>) : null),
    (e) => {
      // Permission denied = the admin moved it back to draft or it was deleted.
      if ((e as { code?: string }).code === 'firestore/permission-denied') onData(null);
      else onError?.(e);
    },
  );
}

/** This member's applications on every job (admin-added ones too), live. */
export function subscribeMyApplications(
  uid: string,
  onData: (apps: JobApplication[]) => void,
  onError?: (e: Error) => void,
): () => void {
  return onSnapshot(
    query(collectionGroup(db, 'applications'), where('userUid', '==', uid)),
    (snap) =>
      onData(
        snap.docs.map((d) => {
          const a = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            jobId: d.ref.parent.parent?.id ?? String(a.jobId ?? ''),
            userUid: String(a.userUid ?? ''),
            status: (a.status as ApplicationStatus) ?? 'pending',
            cancelledAt: typeof a.cancelledAt === 'string' ? a.cancelledAt : undefined,
            addedAt: (a.addedAt as JobApplication['addedAt']) ?? null,
            addedAtMs: tsMs(a.addedAt),
            statusUpdatedAtMs: tsMs(a.statusUpdatedAt) ?? tsMs(a.cancelledAtServer),
          };
        }),
      ),
    (e) => onError?.(e),
  );
}

export type Booking = { job: Job; app: JobApplication };

/**
 * My bookings: each of my applications with its job, live (job changes from the admin included).
 * Jobs that are draft again or deleted are left out.
 */
export function subscribeMyBookings(
  uid: string,
  onData: (bookings: Booking[]) => void,
  onError?: (e: Error) => void,
): () => void {
  const jobs = new Map<string, Job | null>();
  const jobUnsubs = new Map<string, () => void>();
  let apps: JobApplication[] = [];
  let appsLoaded = false;

  const emit = () => {
    if (!appsLoaded) return;
    if (apps.some((a) => !jobs.has(a.jobId))) return; // wait until every job has loaded once
    const list: Booking[] = [];
    for (const app of apps) {
      const job = jobs.get(app.jobId);
      if (job) list.push({ job, app });
    }
    onData(list);
  };

  const offApps = subscribeMyApplications(
    uid,
    (next) => {
      apps = next;
      appsLoaded = true;
      const ids = new Set(next.map((a) => a.jobId));
      for (const [id, off] of jobUnsubs) {
        if (!ids.has(id)) {
          off();
          jobUnsubs.delete(id);
          jobs.delete(id);
        }
      }
      for (const id of ids) {
        if (jobUnsubs.has(id)) continue;
        jobUnsubs.set(
          id,
          subscribeJob(
            id,
            (job) => {
              jobs.set(id, job);
              emit();
            },
            () => {
              jobs.set(id, null);
              emit();
            },
          ),
        );
      }
      emit();
    },
    onError,
  );

  return () => {
    offApps();
    jobUnsubs.forEach((off) => off());
    jobUnsubs.clear();
  };
}

/**
 * My payouts and penalties, newest first. Drafts (not yet checked by the admin) are left out
 * unless includeDrafts is set (Earnings shows them as "Pending").
 */
export function subscribeMyPayments(
  uid: string,
  onData: (rows: PaymentTransaction[]) => void,
  onError?: (e: Error) => void,
  includeDrafts = false,
): () => void {
  return onSnapshot(
    query(collection(db, 'paymentTransactions'), where('userUid', '==', uid)),
    (snap) => {
      const rows = snap.docs
        .map((d) => {
          const t = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            txnId: String(t.txnId ?? ''),
            type: (t.type as PaymentTransaction['type']) ?? 'payout',
            status: (t.status as PaymentTransaction['status']) ?? 'draft',
            amount: Number(t.amount ?? 0) || 0,
            jobId: String(t.jobId ?? ''),
            jobIdLabel: String(t.jobIdLabel ?? ''),
            method: String(t.method ?? ''),
            note: typeof t.note === 'string' ? t.note : undefined,
            completedAtMs:
              t.completedAt && typeof (t.completedAt as { toMillis?: () => number }).toMillis === 'function'
                ? (t.completedAt as { toMillis: () => number }).toMillis()
                : undefined,
            applicationId: typeof t.applicationId === 'string' ? t.applicationId : undefined,
            hourlyRate: Number(t.hourlyRate ?? 0) || 0,
            adjustedHours: Number(t.adjustedHours ?? 0) || 0,
            bonus: Number(t.bonus ?? 0) || 0,
            deduction: Number(t.deduction ?? 0) || 0,
            lastUpdate: typeof t.lastUpdate === 'string' ? t.lastUpdate : undefined,
            createdAt: (t.createdAt as PaymentTransaction['createdAt']) ?? null,
          };
        })
        .filter((t) => t.status !== 'failed' && (includeDrafts || t.status !== 'draft'));
      rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      onData(rows);
    },
    (e) => onError?.(e),
  );
}

/* ------------------------------------------------------------------ booking state */

export type BookingState = 'pending' | 'confirmed' | 'completed' | 'rejected' | 'cancelled' | 'job_cancelled';

/** What a member sees for one booking. */
export function bookingState(b: Booking, now = Date.now()): BookingState {
  if (b.app.status === 'cancelled') return 'cancelled';
  if (b.app.status === 'rejected') return 'rejected';
  if (b.job.status === 'cancelled') return 'job_cancelled';
  if (b.app.status === 'approved') {
    const end = eventEndMs(b.job);
    if (b.job.status === 'closed' || (end != null && end < now)) return 'completed';
    return 'confirmed';
  }
  return 'pending';
}

export function isUpcoming(b: Booking, now = Date.now()): boolean {
  const s = bookingState(b, now);
  return s === 'pending' || s === 'confirmed';
}

/* ------------------------------------------------------------------ actions */

export class JobActionError extends Error {}

/** The booking of mine that clashes with this job's date and hours, if any. */
export function findTimeConflict(job: Job, bookings: Booking[]): Job | null {
  for (const b of bookings) {
    if (b.job.id === job.id) continue;
    if (b.job.status === 'cancelled') continue;
    if (b.app.status !== 'pending' && b.app.status !== 'approved') continue;
    if (overlaps(job, b.job)) return b.job;
  }
  return null;
}

/**
 * Apply for a job. `bookings` is the member's current list (from subscribeMyBookings),
 * used for the duplicate and time-conflict checks.
 */
export async function applyToJob(job: Job, user: UserDoc, bookings: Booking[]): Promise<void> {
  if (user.status === 'under_review')
    throw new JobActionError('Your updated profile is being reviewed. You can apply again once the admin approves it.');
  if (user.status !== 'approved') throw new JobActionError('Your account needs to be approved before you can apply.');
  if (job.status !== 'open') throw new JobActionError('This job is no longer taking applications.');
  if ((eventStartMs(job) ?? Number.MAX_SAFE_INTEGER) <= Date.now())
    throw new JobActionError('This job has already started.');

  const mine = bookings.find((b) => b.job.id === job.id);
  if (mine && mine.app.status === 'rejected')
    throw new JobActionError('The organiser didn’t select you for this job.');
  if (mine && (mine.app.status === 'pending' || mine.app.status === 'approved'))
    throw new JobActionError('You’ve already applied for this job.');

  const conflict = findTimeConflict(job, bookings);
  if (conflict)
    throw new JobActionError(`You’re already booked for “${conflict.title}” at the same time.`);

  if (await isBlockedBy(job.corporateId, user.uid))
    throw new JobActionError('You can’t apply for this organiser’s jobs.');

  const doneBefore = bookings.filter((b) => bookingState(b) === 'completed').length;
  const name = user.profile?.fullName?.trim() || user.email.split('@')[0];

  // Applied before and cancelled (possibly through the admin with another id): apply again.
  if (mine && mine.app.status === 'cancelled') {
    if (mine.app.id !== user.uid) {
      throw new JobActionError('Please contact support to re-apply for this job.');
    }
    await updateDoc(doc(db, 'jobs', job.id, 'applications', user.uid), {
      status: 'pending',
      name,
      phone: user.phone ?? '',
      doneBefore: String(doneBefore).padStart(2, '0'),
      statusUpdatedAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(doc(db, 'jobs', job.id, 'applications', user.uid), {
    jobId: job.id,
    userUid: user.uid,
    uid: user.uid.slice(0, 6).toUpperCase(),
    name,
    email: user.email,
    phone: user.phone ?? '',
    status: 'pending',
    doneBefore: String(doneBefore).padStart(2, '0'),
    addedAt: serverTimestamp(),
    addedBy: 'app',
  });
}

/** Cancel my application. Within 24h of the shift the admin dashboard adds a $50 penalty. */
export async function cancelBooking(b: Booking): Promise<void> {
  if (b.app.status !== 'pending' && b.app.status !== 'approved')
    throw new JobActionError('This booking can’t be cancelled.');
  if ((eventStartMs(b.job) ?? Number.MAX_SAFE_INTEGER) <= Date.now())
    throw new JobActionError('This shift has already started, so it can’t be cancelled here.');
  await updateDoc(doc(db, 'jobs', b.job.id, 'applications', b.app.id), {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    cancelledAtServer: serverTimestamp(),
    statusUpdatedAt: serverTimestamp(),
  });
}
