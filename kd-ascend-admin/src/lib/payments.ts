/** Placeholder until payment transactions are stored in Firestore. */

import { getJobApplications, type JobApplication } from './jobApplications';
import { assumedHoursFromEventTime, eventStartMs } from './jobSchedule';
import { getUserPayoutMethodLabel } from './users';
import { getAllJobs, type Job } from './jobs';

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

/** In-memory until Firestore; rows only appear after a job is closed (see createPayoutsForClosedJob). */
const store: PaymentTransaction[] = [];

export function getPaymentTransactions(): PaymentTransaction[] {
  return [...store];
}

export function getPayment(id: string): PaymentTransaction | null {
  return store.find((t) => t.id === id) ?? null;
}

export function paymentStats(list: PaymentTransaction[] = store): {
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextTxnId(): string {
  const nums = store.map((t) => parseInt(t.txnId.replace(/\D/g, ''), 10)).filter((n) => !Number.isNaN(n));
  return `TXN${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

function applyInput(row: PaymentTransaction, input: PaymentInput, status: PaymentStatus): PaymentTransaction {
  const adj = normalizePaymentAdjustments(input.bonus, input.deduction);
  const inputNorm = { ...input, bonus: adj.bonus, deduction: adj.deduction };
  const { final } = paymentTotals(inputNorm.adjustedHours, inputNorm.hourlyRate, inputNorm.bonus, inputNorm.deduction);
  return {
    ...row,
    ...inputNorm,
    amount: final,
    status,
    lastUpdate: today(),
  };
}

function insertPayment(input: PaymentInput, status: PaymentStatus, applicationId?: string): string {
  const newId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  store.unshift(
    applyInput(
      {
        id: newId,
        txnId: nextTxnId(),
        applicationId,
        userUid: '',
        userName: '',
        userEmail: '',
        jobId: '',
        jobIdLabel: '',
        type: 'payout',
        amount: 0,
        method: 'Bank Transfer',
        status: 'draft',
        lastUpdate: today(),
        assumedHours: 0,
        hourlyRate: 0,
        adjustedHours: 0,
        bonus: 0,
        deduction: 0,
        note: '',
      },
      input,
      status,
    ),
  );
  return newId;
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
    store.find((t) => {
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
    created.push(insertPayment(input, 'draft', app.id));
  }
  return created;
}

export async function savePayment(id: string, input: PaymentInput, status: PaymentStatus): Promise<string> {
  const i = store.findIndex((t) => t.id === id);
  if (i < 0) throw new Error('Transaction not found.');
  store[i] = applyInput(store[i], input, status);
  return id;
}

export async function completePayment(id: string): Promise<void> {
  const row = store.find((t) => t.id === id);
  if (!row) throw new Error('Transaction not found.');
  if (row.status !== 'pending') throw new Error('Verify the payment before completing it.');
  row.status = 'completed';
  row.lastUpdate = today();
}

export async function updatePaymentStatus(id: string, status: PaymentStatus): Promise<void> {
  const row = store.find((t) => t.id === id);
  if (!row) throw new Error('Transaction not found.');
  row.status = status;
  row.lastUpdate = today();
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
