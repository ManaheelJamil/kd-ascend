/**
 * Earnings module: the member's payouts and late-cancel penalties (paymentTransactions,
 * written by the admin dashboard) joined with the jobs they belong to.
 */
import type { Booking, Job, PaymentTransaction } from './jobsService';
import { formatMoney, shortDate, timeLabel } from './jobsService';

/** What the member sees for a transaction (Figma dropdown 267:687). */
export type TxnLabel = 'Pending' | 'Processing' | 'Paid' | 'Deducted';
export const TXN_TYPES = ['All', 'Pending', 'Processing', 'Paid', 'Deducted'] as const;
export type TxnFilter = (typeof TXN_TYPES)[number];

/** Sort options (Figma dropdown 271:731). */
export const TXN_SORTS = ['Completed Date', 'Company Name', 'Transaction Type', 'Earnings'] as const;
export type TxnSort = (typeof TXN_SORTS)[number];

export type EarningsFilters = {
  type: TxnFilter;
  sort: TxnSort;
  /** Inclusive range, local midnight (ms). null = no limit. */
  from: number | null;
  to: number | null;
};

export const DEFAULT_EARNINGS_FILTERS: EarningsFilters = { type: 'All', sort: 'Completed Date', from: null, to: null };

export type EarningRow = {
  txn: PaymentTransaction;
  job: Job | null;
  label: TxnLabel;
  /** Signed amount: payouts positive, penalties negative. */
  signed: number;
  /** Date shown on the card and used for sorting / the date range (ms). */
  dateMs: number;
  /** "ID #20260112_aS1v4" style reference. */
  reference: string;
};

/**
 * draft → Pending (job finished, admin hasn't checked the payout yet)
 * pending → Processing (checked, waiting to be paid)
 * completed → Paid (payout) / Deducted (penalty)
 * A penalty is "Deducted" as soon as the admin has confirmed it.
 */
export function txnLabel(t: PaymentTransaction): TxnLabel {
  if (t.type === 'penalty') return t.status === 'draft' ? 'Pending' : 'Deducted';
  if (t.status === 'completed') return 'Paid';
  if (t.status === 'pending') return 'Processing';
  return 'Pending';
}

function isoToMs(iso?: string): number | null {
  const p = (iso || '').split('-').map((x) => Number.parseInt(x, 10));
  if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return null;
  return new Date(p[0], p[1] - 1, p[2]).getTime();
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Join payments with the jobs from my bookings. */
export function buildRows(payments: PaymentTransaction[], bookings: Booking[]): EarningRow[] {
  const jobs = new Map(bookings.map((b) => [b.job.id, b.job]));
  return payments.map((txn) => {
    const job = jobs.get(txn.jobId) ?? null;
    const label = txnLabel(txn);
    const dateMs =
      txn.completedAtMs ?? isoToMs(txn.lastUpdate) ?? txn.createdAt?.toMillis?.() ?? (job ? isoToMs(job.eventDate) : null) ?? 0;
    const app = txn.applicationId ?? txn.id.split('_').pop() ?? '';
    const reference = job ? `${job.eventDate.replace(/-/g, '')}_${app.slice(0, 5)}` : txn.txnId || txn.jobIdLabel;
    return { txn, job, label, signed: txn.type === 'penalty' ? -txn.amount : txn.amount, dateMs, reference };
  });
}

export function applyEarningsFilters(rows: EarningRow[], f: EarningsFilters): EarningRow[] {
  const out = rows.filter((r) => {
    if (f.type !== 'All' && r.label !== f.type) return false;
    if (f.from != null && r.dateMs < f.from) return false;
    if (f.to != null && r.dateMs >= f.to + 24 * 60 * 60 * 1000) return false;
    return true;
  });
  const company = (r: EarningRow) => (r.job?.corporateName ?? r.txn.jobIdLabel).toLowerCase();
  const order: Record<TxnLabel, number> = { Paid: 0, Processing: 1, Pending: 2, Deducted: 3 };
  out.sort((a, b) => {
    if (f.sort === 'Company Name') return company(a).localeCompare(company(b)) || b.dateMs - a.dateMs;
    if (f.sort === 'Transaction Type') return order[a.label] - order[b.label] || b.dateMs - a.dateMs;
    if (f.sort === 'Earnings') return b.signed - a.signed;
    return b.dateMs - a.dateMs;
  });
  return out;
}

/** Totals for the summary card: paid earnings, confirmed penalties, and the net. */
export function totals(rows: EarningRow[]) {
  const earned = rows.filter((r) => r.label === 'Paid').reduce((n, r) => n + r.txn.amount, 0);
  const penalties = rows.filter((r) => r.label === 'Deducted').reduce((n, r) => n + r.txn.amount, 0);
  return { earned, penalties, net: earned - penalties };
}

/** "$92", "-$50", "$12.50". */
export function money(n: number): string {
  const abs = Math.abs(n);
  const s = abs % 1 === 0 ? `$${abs}` : formatMoney(abs);
  return n < 0 ? `-${s}` : s;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 July 2026" */
export function longDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "02 Feb 2026" */
export function cardDate(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')} ${SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "12 Jul, 2026" for the filter's date-range field. */
export function fieldDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${SHORT[d.getMonth()]}, ${d.getFullYear()}`;
}

/** Summary card heading: the chosen range, or the span of the transactions shown. */
export function rangeLabel(rows: EarningRow[], f: EarningsFilters): string {
  if (f.from != null || f.to != null) {
    const a = f.from != null ? longDate(f.from) : 'Start';
    const b = f.to != null ? longDate(f.to) : 'Today';
    return `${a} - ${b}`;
  }
  if (rows.length === 0) return 'No transactions yet';
  const ms = rows.map((r) => r.dateMs).filter(Boolean);
  if (ms.length === 0) return 'All time';
  return `${longDate(Math.min(...ms))} - ${longDate(Math.max(...ms))}`;
}

/** Shift line under the company: "02 Feb 2026, 6:00 PM to 12:00 AM". */
export function shiftLine(r: EarningRow): string {
  if (!r.job) return r.txn.jobIdLabel;
  return `${shortDate(r.job.eventDate)}, ${timeLabel(r.job.eventTime)}`;
}

/** Plain-text payslip for the share sheet ("Export Payslip"). */
export function payslipText(opts: { name: string; email: string; rows: EarningRow[]; range: string }): string {
  const t = totals(opts.rows);
  const lines = [
    'KD Ascend — Payslip',
    `Name: ${opts.name}`,
    `Email: ${opts.email}`,
    `Period: ${opts.range}`,
    '',
    `Earnings (paid): ${money(t.earned)}`,
    `Penalties: ${t.penalties ? money(-t.penalties) : '$0'}`,
    `Total after deduction: ${money(t.net)}`,
    '',
    'Transactions:',
    ...opts.rows.map(
      (r) =>
        `• ${cardDate(r.dateMs)}  ${r.job?.corporateName ?? r.txn.jobIdLabel}${r.job ? ` (${r.job.title})` : ''}  ${money(r.signed)}  ${r.label}${
          r.txn.bonus ? `  (bonus ${money(r.txn.bonus)})` : ''
        }${r.txn.deduction ? `  (deduction ${money(-r.txn.deduction)})` : ''}`,
    ),
  ];
  return lines.join('\n');
}
