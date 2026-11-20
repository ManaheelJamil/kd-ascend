/**
 * Payment transactions, stored in Firestore: paymentTransactions/{id}.
 * Rows are only created automatically: a payout per approved applicant when a job is closed,
 * and a penalty when a member cancels less than 24 hours before the shift. The document id is
 * built from type + job + application, so the same payout or penalty can never be created twice.
 */

import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { applicationsReady, getJobApplications, type JobApplication } from './jobApplications';
import { assumedHoursFromEventTime, eventStartMs } from './jobSchedule';
import { getUserPayoutMethodLabel } from './users';
import { getAllJobs, type Job } from './jobs';
import { liveStore, todayIso, withoutUndefined } from './live';

export const LATE_CANCEL_PENALTY_AMOUNT = 50;
const LATE_CANCEL_MS = 24 * 60 * 60 * 1000;

export type PaymentType = 'payout' | 'penalty';
export type PaymentStatus = 'draft' | 'pending' | 'completed' | 'failed';

export function paymentTypeLabel(type: PaymentType): string {
  return type === 'payout' ? 'Payout' : 'Penalty';
}

export function paymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    draft: 'Draft',
    pending: 'Pending',
    completed: 'Completed',
    failed: 'Failed',
  };
  return labels[status] ?? status;
}

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

export type PaymentTransaction = {
  id: string;
  txnId: string;
  /** Source application when auto-created from a closed job. */
  applicationId?: string;
  userUid: string;
  userName: string;
  userEmail: string;
  jobId: string;
  jobIdLabel: string;
  type: PaymentType;
  amount: number;
  method: string;
  status: PaymentStatus;
  /** yyyy-mm-dd */
  lastUpdate: string;
  assumedHours: number;
  hourlyRate: number;
  adjustedHours: number;
  bonus: number;
  deduction: number;
  note: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  updatedBy?: string;
};

export type PaymentInput = {
  userUid: string;
  userName: string;
  userEmail: string;
  jobId: string;
  jobIdLabel: string;
  type: PaymentType;
  method: string;
  assumedHours: number;
  hourlyRate: number;
  adjustedHours: number;
  bonus: number;
  deduction: number;
  note: string;
};

const money = (n: number) => Math.round(n * 100) / 100;

export function paymentTotals(hours: number, rate: number, bonus: number, deduction = 0) {
  const h = Number.isFinite(hours) ? hours : 0;
  const r = Number.isFinite(rate) ? rate : 0;
  const b = Math.max(0, Number.isFinite(bonus) ? bonus : 0);
  const d = Math.max(0, Number.isFinite(deduction) ? deduction : 0);
  const base = money(h * r);
  const rawFinal = money(base + b - d);
  const final = Math.max(0, rawFinal);
  return { base, bonus: b, deduction: d, rawFinal, final };
}

/** Legacy rows may store a negative bonus; map to deduction in the form. */
export function normalizePaymentAdjustments(bonus: number, deduction = 0): { bonus: number; deduction: number } {
  if (bonus < 0) {
    return { bonus: 0, deduction: Math.max(0, deduction || Math.abs(bonus)) };
  }
  return { bonus: Math.max(0, bonus), deduction: Math.max(0, deduction) };
}

export function paymentCalcLine(hours: number, rate: number, bonus: number, deduction = 0): string {
  const { final, bonus: b, deduction: d } = paymentTotals(hours, rate, bonus, deduction);
  const bonusBit = b > 0 ? ` + $${b.toFixed(2)} bonus` : '';
  const deductionBit = d > 0 ? ` − $${d.toFixed(2)} deduction` : '';
  return `${hours} hrs × $${rate.toFixed(2)}/hr${bonusBit}${deductionBit} = $${final.toFixed(2)}`;
}

export function validatePaymentInput(input: PaymentInput, forVerify: boolean): string | null {
  if (!input.jobId) return 'Job is missing on this payment.';
  if (!input.userUid && !input.userEmail.trim() && !input.userName.trim()) return 'User is missing on this payment.';
  if (!forVerify) return null;
  if (!(input.adjustedHours > 0)) return 'Enter adjusted hours.';
  if (!(input.hourlyRate > 0)) return 'Hourly rate is missing.';
  const d = Math.max(0, input.deduction ?? 0);
  if (d > 0 && !input.note.trim()) return 'Add a note explaining the deduction.';
  return null;
}

const paymentsCol = collection(db, 'paymentTransactions');
const paymentRef = (id: string) => doc(db, 'paymentTransactions', id);
const adminId = () => auth.currentUser?.email ?? auth.currentUser?.uid ?? 'admin';
const millis = (t?: Timestamp | null) => (t && typeof t.toMillis === 'function' ? t.toMillis() : Number.MAX_SAFE_INTEGER);

/** All transactions, newest first, kept live. */
const paymentsStore = liveStore<PaymentTransaction[]>([], (set, fail) =>
  onSnapshot(
    paymentsCol,
    (snap) =>
      set(
        snap.docs
          .map((d) => ({ ...(d.data() as Omit<PaymentTransaction, 'id'>), id: d.id }))
          .sort((x, y) => millis(y.createdAt) - millis(x.createdAt) || y.txnId.localeCompare(x.txnId)),
      ),
    (e) => fail(e),
  ),
);

export const paymentsReady = () => paymentsStore.ready();

export function getPaymentTransactions(): PaymentTransaction[] {
  return [...paymentsStore.get()];
}

export function subscribePaymentTransactions(
  onData: (list: PaymentTransaction[]) => void,
  onError?: (e: Error) => void,
): () => void {
  return paymentsStore.subscribe((list) => onData([...list]), onError);
}

export function getPayment(id: string): PaymentTransaction | null {
  return paymentsStore.get().find((t) => t.id === id) ?? null;
}

/** Waits for the first snapshot, then returns the transaction (null when it doesn't exist). */
export async function loadPayment(id: string): Promise<PaymentTransaction | null> {
  await paymentsStore.ready();
  return getPayment(id);
}

/** One transaction, live (null when it doesn't exist). */
export function subscribePayment(
  id: string,
  onData: (t: PaymentTransaction | null) => void,
  onError?: (e: Error) => void,
): () => void {
  return paymentsStore.subscribe((list) => onData(list.find((t) => t.id === id) ?? null), onError);
}

export function paymentStats(list: PaymentTransaction[] = getPaymentTransactions()): {
  totalPenalties: number;
  totalPayouts: number;
  pendingPayout: number;
} {
  let totalPenalties = 0;
  let totalPayouts = 0;
  let pendingPayout = 0;
  for (const t of list) {
    if (t.type === 'penalty') totalPenalties += t.amount;
    else if (t.type === 'payout' && t.status === 'completed') totalPayouts += t.amount;
    else if (t.type === 'payout' && (t.status === 'pending' || t.status === 'draft')) {
      pendingPayout += t.amount;
    }
  }
  return { totalPenalties, totalPayouts, pendingPayout };
}

export function formatMoney(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `$${n.toFixed(2)}`;
}

function computeFields(input: PaymentInput, status: PaymentStatus) {
  const adj = normalizePaymentAdjustments(input.bonus, input.deduction);
  const inputNorm = { ...input, bonus: adj.bonus, deduction: adj.deduction };
  const { final } = paymentTotals(inputNorm.adjustedHours, inputNorm.hourlyRate, inputNorm.bonus, inputNorm.deduction);
  return { ...inputNorm, amount: final, status, lastUpdate: todayIso() };
}

/** Same payout / penalty for the same application always maps to the same document. */
function paymentDocId(type: PaymentType, jobId: string, applicationId: string | undefined, who: string): string {
  const key = applicationId || who || 'unknown';
  return `${type}_${jobId}_${key}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 200);
}

/**
 * Creates the transaction unless it already exists (safe to call again and again).
 * TXN numbers come from counters/paymentTxn. Returns the new id, or null when it already existed.
 */
async function insertPayment(input: PaymentInput, status: PaymentStatus, applicationId?: string): Promise<string | null> {
  const id = paymentDocId(input.type, input.jobId, applicationId, input.userUid || input.userEmail.trim().toLowerCase());
  const counter = doc(db, 'counters', 'paymentTxn');
  return runTransaction(db, async (tx) => {
    const existing = await tx.get(paymentRef(id));
    if (existing.exists()) return null;
    const c = await tx.get(counter);
    const next = ((c.data()?.last as number | undefined) ?? 0) + 1;
    tx.set(counter, { last: next }, { merge: true });
    tx.set(
      paymentRef(id),
      withoutUndefined({
        ...computeFields(input, status),
        txnId: `TXN${next}`,
        applicationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: 'system',
      }),
    );
    return id;
  });
}

export function findPaymentForApplication(
  jobId: string,
  applicationId: string,
  userUid: string,
  email: string,
  type: PaymentType,
): PaymentTransaction | null {
  const emailNorm = email.trim().toLowerCase();
  return (
    getPaymentTransactions().find((t) => {
      if (t.jobId !== jobId || t.type !== type) return false;
      if (applicationId && t.applicationId === applicationId) return true;
      if (userUid && t.userUid === userUid) return true;
      if (emailNorm && t.userEmail.trim().toLowerCase() === emailNorm) return true;
      return false;
    }) ?? null
  );
}

export function isLateJobCancellation(job: Job, cancelledAtIso: string): boolean {
  const start = eventStartMs(job.eventDate, job.eventTime);
  if (start == null) return false;
  const cancelled = new Date(cancelledAtIso).getTime();
  if (!Number.isFinite(cancelled) || cancelled >= start) return false;
  return start - cancelled < LATE_CANCEL_MS;
}

/** Creates a draft $50 penalty when cancel was within 24h of shift start; independent of job status. */
export async function ensureLateCancelPenalty(job: Job, app: JobApplication): Promise<string | null> {
  if (app.status !== 'cancelled' || !app.cancelledAt) return null;
  if (!isLateJobCancellation(job, app.cancelledAt)) return null;
  if (findPaymentForApplication(job.id, app.id, app.userUid, app.email, 'penalty')) return null;
  const method = await getUserPayoutMethodLabel(app.userUid);
  const input: PaymentInput = {
    userUid: app.userUid,
    userName: app.name,
    userEmail: app.email,
    jobId: job.id,
    jobIdLabel: job.jobId,
    type: 'penalty',
    method,
    assumedHours: 1,
    hourlyRate: LATE_CANCEL_PENALTY_AMOUNT,
    adjustedHours: 1,
    bonus: 0,
    deduction: 0,
    note: 'Late cancellation (within 24 hours of shift start).',
  };
  return insertPayment(input, 'draft', app.id);
}

/** Ensures penalty rows exist for all qualifying cancellations (e.g. on payment list load). */
export async function syncLateCancelPenalties(): Promise<number> {
  await Promise.all([applicationsReady(), paymentsStore.ready()]);
  let created = 0;
  for (const job of getAllJobs()) {
    for (const app of getJobApplications(job.id)) {
      const id = await ensureLateCancelPenalty(job, app);
      if (id) created += 1;
    }
  }
  return created;
}

/**
 * One draft payout per approved applicant when a job is closed.
 * Idempotent: approved applicants added after close need the job reopened then closed again.
 */
export async function createPayoutsForClosedJob(job: Job): Promise<string[]> {
  await Promise.all([applicationsReady(), paymentsStore.ready()]);
  const approved = getJobApplications(job.id).filter((a) => a.status === 'approved');
  const created: string[] = [];
  const assumedHours = assumedHoursFromEventTime(job.eventTime);
  const hourlyRate = parseHourlyRate(job.salary);
  for (const app of approved) {
    if (findPaymentForApplication(job.id, app.id, app.userUid, app.email, 'payout')) continue;
    const method = await getUserPayoutMethodLabel(app.userUid);
    const input: PaymentInput = {
      userUid: app.userUid,
      userName: app.name,
      userEmail: app.email,
      jobId: job.id,
      jobIdLabel: job.jobId,
      type: 'payout',
      method,
      assumedHours,
      hourlyRate,
      adjustedHours: assumedHours,
      bonus: 0,
      deduction: 0,
      note: '',
    };
    const id = await insertPayment(input, 'draft', app.id);
    if (id) created.push(id);
  }
  return created;
}

/** Saves edits to an existing transaction (there is no manual "create payment"). */
export async function savePayment(id: string, input: PaymentInput, status: PaymentStatus): Promise<string> {
  const snap = await getDoc(paymentRef(id));
  if (!snap.exists()) throw new Error('Transaction not found.');
  await updateDoc(paymentRef(id), withoutUndefined({ ...computeFields(input, status), updatedAt: serverTimestamp(), updatedBy: adminId() }));
  return id;
}

export async function completePayment(id: string): Promise<void> {
  const snap = await getDoc(paymentRef(id));
  if (!snap.exists()) throw new Error('Transaction not found.');
  if ((snap.data() as PaymentTransaction).status !== 'pending') throw new Error('Verify the payment before completing it.');
  await updateDoc(paymentRef(id), {
    status: 'completed',
    lastUpdate: todayIso(),
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: adminId(),
  });
}

export async function updatePaymentStatus(id: string, status: PaymentStatus): Promise<void> {
  const snap = await getDoc(paymentRef(id));
  if (!snap.exists()) throw new Error('Transaction not found.');
  await updateDoc(paymentRef(id), { status, lastUpdate: todayIso(), updatedAt: serverTimestamp(), updatedBy: adminId() });
}

/** Verified (pending) or completed → checkout; draft / failed → edit. */
export function paymentDetailHref(id: string, status: PaymentStatus): string {
  if (status === 'pending' || status === 'completed') return `/payment/${id}/checkout`;
  return `/payment/${id}/edit`;
}

export function downloadPaymentReceipt(t: PaymentTransaction) {
  const adj = normalizePaymentAdjustments(t.bonus, t.deduction);
  const totals = paymentTotals(t.adjustedHours, t.hourlyRate, adj.bonus, adj.deduction);
  const lines = [
    'KD Ascend — Payment Receipt',
    '================================',
    '',
    `Transaction ID: ${t.txnId}`,
    `Status: ${paymentStatusLabel(t.status)}`,
    `Date: ${t.lastUpdate}`,
    '',
    `Payee: ${t.userName}`,
    `Email: ${t.userEmail || '—'}`,
    `Job: ${t.jobIdLabel}`,
    `Method: ${t.method}`,
    '',
    `Assumed hours: ${t.assumedHours}`,
    `Adjusted hours: ${t.adjustedHours}`,
    `Hourly rate: ${formatMoney(t.hourlyRate)}`,
    `Base amount: ${formatMoney(totals.base)}`,
    `Bonus: ${formatMoney(totals.bonus)}`,
    `Deduction: ${formatMoney(totals.deduction)}`,
    `Final amount: ${formatMoney(totals.final)}`,
    '',
    `Calculation: ${paymentCalcLine(t.adjustedHours, t.hourlyRate, adj.bonus, adj.deduction)}`,
    t.note.trim() ? `Note: ${t.note.trim()}` : '',
    '',
    '— Generated from KD Ascend Admin',
  ].filter(Boolean);
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kd-ascend-receipt-${t.txnId}-${t.lastUpdate}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseHourlyRate(salary: string): number {
  const m = salary.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 10;
}
