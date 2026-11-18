'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, SquarePen } from 'lucide-react';
import { PaymentStatusPicker, PaymentTypeCell } from '@/components/PaymentBits';
import { cn, ui } from '@/components/ui';
import { formatMoney, paymentStatusLabel, type PaymentStatus, type PaymentTransaction } from '@/lib/payments';

type SortKey = 'txnId' | 'user' | 'jobId' | 'type' | 'amount' | 'method' | 'status' | 'lastUpdate';

const COLUMNS: { key: SortKey | 'actions'; label: string; className: string }[] = [
  { key: 'txnId', label: 'Transaction ID', className: 'w-[13%] min-w-[128px] pl-[51px]' },
  { key: 'user', label: 'User', className: 'w-[13%]' },
  { key: 'jobId', label: 'Job ID', className: 'w-[9%]' },
  { key: 'type', label: 'Type', className: 'w-[11%]' },
  { key: 'amount', label: 'Amount', className: 'w-[10%]' },
  { key: 'method', label: 'Method', className: 'w-[12%]' },
  { key: 'status', label: 'Status', className: 'w-[12%] pl-[18px]' },
  { key: 'lastUpdate', label: 'Last Update', className: 'w-[11%] pl-[18px]' },
  { key: 'actions', label: 'Actions', className: 'w-[9%] pr-[18px] text-right' },
];

const sortValue = (t: PaymentTransaction, key: SortKey): string | number => {
  switch (key) {
    case 'txnId':
      return t.txnId.toLowerCase();
    case 'user':
      return t.userName.toLowerCase();
    case 'jobId':
      return t.jobIdLabel.toLowerCase();
    case 'type':
      return t.type;
    case 'amount':
      return t.amount;
    case 'method':
      return t.method.toLowerCase();
    case 'status':
      return t.status;
    case 'lastUpdate':
      return t.lastUpdate;
  }
};

export function PaymentsTable({
  transactions,
  selected,
  onSelectedChange,
  onStatusChange,
  statusBusy,
  emptyText = 'No transactions match your search.',
}: {
  transactions: PaymentTransaction[];
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
  onStatusChange: (t: PaymentTransaction, status: PaymentStatus) => void;
  statusBusy: string | null;
  emptyText?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'lastUpdate', dir: -1 });

  const rows = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        const va = sortValue(a, sort.key);
        const vb = sortValue(b, sort.key);
        return va < vb ? -sort.dir : va > vb ? sort.dir : 0;
      }),
    [transactions, sort],
  );

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => onSelectedChange(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  };

  return (
    <>
      <ul className="divide-y divide-line md:hidden">
        {rows.length === 0 ? (
          <li className="px-4 py-12 text-center text-[15px] text-muted">{emptyText}</li>
        ) : (
          rows.map((t) => (
            <li
              key={t.id}
              onClick={() => router.push(`/users/${t.userUid}`)}
              className="flex cursor-pointer items-start gap-3 px-4 py-3.5 active:bg-page"
            >
              <input
                type="checkbox"
                aria-label={`Select ${t.txnId}`}
                checked={selected.has(t.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggle(t.id)}
                className="mt-3 size-5 shrink-0 rounded border-[#d9d9d9]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[15px] font-semibold text-ink">{t.txnId}</p>
                  <span onClick={(e) => e.stopPropagation()}>
                    <PaymentStatusPicker value={t.status} busy={statusBusy === t.id} onChange={(s) => onStatusChange(t, s)} />
                  </span>
                </div>
                <p className="truncate text-[13px] text-muted">{t.userName}</p>
                <p className="mt-1 truncate text-[12.5px] text-muted">
                  {t.jobIdLabel} · {formatMoney(t.amount)} · {t.method}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <PaymentTypeCell type={t.type} />
                  <span className="text-[12.5px] text-muted">{t.lastUpdate}</span>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1180px] table-fixed border-collapse text-left">
          <thead>
            <tr className="h-16 border-b border-line bg-page">
              {COLUMNS.map((col, i) => (
                <th key={col.key} className={cn('relative px-[18px]', ui.tableHead, col.className)}>
                  {i === 0 ? (
                    <input
                      type="checkbox"
                      aria-label="Select all transactions"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="absolute top-1/2 left-[19px] size-5 -translate-y-1/2 rounded border-[#d9d9d9]"
                    />
                  ) : null}
                  {col.key === 'actions' ? (
                    col.label
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setSort((s) => ({ key: col.key as SortKey, dir: s.key === col.key ? (s.dir === 1 ? -1 : 1) : 1 }))
                      }
                      className="inline-flex items-center gap-0.5 whitespace-nowrap hover:text-ink"
                    >
                      {col.label}
                      <ChevronDown
                        className={cn('size-5 shrink-0 transition', sort.key === col.key && sort.dir === -1 && 'rotate-180')}
                        strokeWidth={1.8}
                      />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="py-14 text-center text-[15px] text-muted">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/users/${t.userUid}`)}
                  className="h-[69px] cursor-pointer border-b border-line last:border-b-0 hover:bg-page/70"
                >
                  <td className="relative px-[18px] pl-[51px]">
                    <input
                      type="checkbox"
                      aria-label={`Select ${t.txnId}`}
                      checked={selected.has(t.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggle(t.id)}
                      className="absolute top-1/2 left-[19px] size-5 -translate-y-1/2 rounded border-[#d9d9d9]"
                    />
                    <span className="block truncate text-[15.8px] font-medium text-ink">{t.txnId}</span>
                  </td>
                  <td className="truncate px-[18px] text-[15.8px] font-medium text-ink" title={t.userName}>
                    {t.userName}
                  </td>
                  <td className="truncate px-1.5 text-[13.5px] text-muted">{t.jobIdLabel}</td>
                  <td className="px-[18px]" onClick={(e) => e.stopPropagation()}>
                    <PaymentTypeCell type={t.type} />
                  </td>
                  <td className="truncate px-[18px] text-[15.8px] font-medium text-ink">{formatMoney(t.amount)}</td>
                  <td className="truncate px-1.5 text-[13.5px] text-muted" title={t.method}>
                    {t.method}
                  </td>
                  <td className="min-w-[124px] px-[18px]" onClick={(e) => e.stopPropagation()}>
                    <PaymentStatusPicker value={t.status} busy={statusBusy === t.id} onChange={(s) => onStatusChange(t, s)} />
                  </td>
                  <td className="px-[18px] text-[13.5px] text-muted">{t.lastUpdate}</td>
                  <td className="px-[18px]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/jobs/${t.jobId}`}
                        aria-label="View job"
                        title="View job"
                        className="grid size-[31px] place-items-center rounded-control text-muted transition hover:bg-page hover:text-ink"
                      >
                        <SquarePen className="size-[18px]" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}