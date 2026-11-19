'use client';

import { type ReactNode, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import { Button, Modal, cn, ui } from './ui';
import {
  PAYMENT_STATUSES,
  formatMoney,
  normalizePaymentAdjustments,
  paymentStatusLabel,
  paymentTypeLabel,
  type PaymentStatus,
  type PaymentTransaction,
  type PaymentType,
} from '@/lib/payments';

const STATUS_BADGE: Record<PaymentStatus, string> = {
  draft: 'bg-muted/10 text-muted',
  pending: 'bg-brand/10 text-brand',
  completed: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
};

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[27px] items-center rounded-full px-[11px] text-[13.5px] font-medium whitespace-nowrap',
        STATUS_BADGE[status],
        className,
      )}
    >
      {paymentStatusLabel(status)}
    </span>
  );
}

export function PaymentStatusPicker({
  value,
  onChange,
  busy,
  className,
}: {
  value: PaymentStatus;
  onChange: (s: PaymentStatus) => void;
  busy?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'relative inline-flex h-[34px] min-w-[8.25rem] shrink-0 items-center whitespace-nowrap rounded-full pr-8 pl-3.5 text-[13.5px] font-medium',
        STATUS_BADGE[value],
        busy && 'opacity-60',
        className,
      )}
    >
      <span>{paymentStatusLabel(value)}</span>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5" />
      <select
        aria-label="Transaction status"
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value as PaymentStatus)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {PAYMENT_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Summary sidebar on payment edit + checkout — same heights, grids, and widths. */
export const paymentActionClasses = {
  stack: 'mt-6 flex flex-col gap-3',
  row2: 'grid grid-cols-2 gap-3',
  row3: 'grid grid-cols-3 gap-3',
  full: 'h-[51px] w-full font-semibold',
  fullIcon: 'h-[51px] w-full justify-center gap-2 font-semibold',
} as const;

export function PaymentSummaryActions({ children }: { children: ReactNode }) {
  return <div className={paymentActionClasses.stack}>{children}</div>;
}

export function PaymentSummaryActionsRow({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={cols === 3 ? paymentActionClasses.row3 : paymentActionClasses.row2}>{children}</div>;
}

export function PaymentTypeCell({ type }: { type: PaymentType }) {
  const payout = type === 'payout';
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-ink">
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-full',
          payout ? 'bg-[#f3e8ff] text-[#7c3aed]' : 'bg-success/10 text-success',
        )}
      >
        {payout ? <ArrowUpRight className="size-3.5" strokeWidth={2.5} /> : <ArrowDownLeft className="size-3.5" strokeWidth={2.5} />}
      </span>
      {paymentTypeLabel(type)}
    </span>
  );
}

export function PaymentCompleteConfirmDialog({
  payment,
  open,
  onClose,
  onConfirm,
}: {
  payment: PaymentTransaction | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError((e as Error).message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (!payment) return null;

  const { deduction } = normalizePaymentAdjustments(payment.bonus, payment.deduction);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-5 sm:p-8">
        <div className="flex items-start gap-[13px]">
          <span className="grid size-[54px] shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
            <Check className="size-6" />
          </span>
          <div>
            <h2 className={ui.sectionTitle}>Complete payment</h2>
            <p className={ui.sectionLead}>This will mark the payout as paid</p>
          </div>
        </div>
        <p className="mt-[17px] text-lg text-muted">
          Are you sure you want to pay <b className="font-semibold text-ink">{formatMoney(payment.amount)}</b> to{' '}
          <b className="font-semibold text-ink">{payment.userName}</b> for job{' '}
          <b className="font-semibold text-ink">{payment.jobIdLabel}</b>?
          {deduction > 0 ? (
            <>
              {' '}
              Includes <b className="font-semibold text-ink">{formatMoney(deduction)}</b> deduction.
            </>
          ) : null}
        </p>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <Button size="lg" className="flex-1" loading={busy} onClick={run}>
            Yes, make payment
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} className="font-medium">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}