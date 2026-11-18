'use client';

import { ArrowDownLeft, ArrowUpRight, ChevronDown } from 'lucide-react';
import { cn } from './ui';
import {
  PAYMENT_STATUSES,
  paymentStatusLabel,
  paymentTypeLabel,
  type PaymentStatus,
  type PaymentType,
} from '@/lib/payments';

const STATUS_BADGE: Record<PaymentStatus, string> = {
  pending: 'bg-brand/10 text-brand',
  completed: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
};

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
        'relative inline-flex h-[34px] min-w-[7.5rem] shrink-0 items-center whitespace-nowrap rounded-full pr-8 pl-3.5 text-[13.5px] font-medium',
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