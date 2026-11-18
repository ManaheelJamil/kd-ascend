/** Placeholder until payment transactions are stored in Firestore. */

export type PaymentType = 'payout' | 'penalty';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

export function paymentTypeLabel(type: PaymentType): string {
  return type === 'payout' ? 'Payout' : 'Penalty';
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return status === 'pending' ? 'Pending' : status === 'completed' ? 'Completed' : 'Failed';
}

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

export type PaymentTransaction = {
  id: string;
  txnId: string;
  userUid: string;
  userName: string;
  jobId: string;
  jobIdLabel: string;
  type: PaymentType;
  amount: number;
  method: string;
  status: PaymentStatus;
  /** yyyy-mm-dd */
  lastUpdate: string;
};

const store: PaymentTransaction[] = [
  {
    id: 'pay-1',
    txnId: 'TXN1',
    userUid: 'uid-sarah',
    userName: 'Sarah Johnson',
    jobId: 'job-1',
    jobIdLabel: 'JID1',
    type: 'payout',
    amount: 150,
    method: 'Bank Transfer',
    status: 'failed',
    lastUpdate: '2026-02-10',
  },
  {
    id: 'pay-2',
    txnId: 'TXN2',
    userUid: 'uid-michael',
    userName: 'Michael Chen',
    jobId: 'job-2',
    jobIdLabel: 'JID2',
    type: 'penalty',
    amount: 50,
    method: 'PayNow',
    status: 'completed',
    lastUpdate: '2026-02-09',
  },
  {
    id: 'pay-3',
    txnId: 'TXN3',
    userUid: 'uid-emily',
    userName: 'Emily Davis',
    jobId: 'job-1',
    jobIdLabel: 'JID1',
    type: 'payout',
    amount: 180,
    method: 'Bank Transfer',
    status: 'pending',
    lastUpdate: '2026-02-11',
  },
  {
    id: 'pay-4',
    txnId: 'TXN4',
    userUid: 'uid-john',
    userName: 'John Doe',
    jobId: 'job-3',
    jobIdLabel: 'JID3',
    type: 'penalty',
    amount: 200,
    method: 'Bank Transfer',
    status: 'completed',
    lastUpdate: '2026-02-08',
  },
  {
    id: 'pay-5',
    txnId: 'TXN5',
    userUid: 'uid-priya',
    userName: 'Priya Nair',
    jobId: 'job-2',
    jobIdLabel: 'JID2',
    type: 'penalty',
    amount: 1000,
    method: 'PayNow',
    status: 'completed',
    lastUpdate: '2026-02-07',
  },
  {
    id: 'pay-6',
    txnId: 'TXN6',
    userUid: 'uid-alex',
    userName: 'Alex Tan',
    jobId: 'job-4',
    jobIdLabel: 'JID4',
    type: 'payout',
    amount: 150,
    method: 'PayNow',
    status: 'completed',
    lastUpdate: '2026-02-06',
  },
];

export function getPaymentTransactions(): PaymentTransaction[] {
  return [...store];
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
    else if (t.type === 'payout' && t.status === 'pending') pendingPayout += t.amount;
  }
  return { totalPenalties, totalPayouts, pendingPayout };
}

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export async function updatePaymentStatus(id: string, status: PaymentStatus): Promise<void> {
  const row = store.find((t) => t.id === id);
  if (!row) throw new Error('Transaction not found.');
  row.status = status;
  row.lastUpdate = new Date().toISOString().slice(0, 10);
}