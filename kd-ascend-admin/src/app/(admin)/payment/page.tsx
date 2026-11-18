'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, Filter, Search, X } from 'lucide-react';
import { PaymentsTable } from '@/components/PaymentsTable';
import { useToast } from '@/components/Toast';
import { Button, Card, PageShell, PageTitle, cn, ui } from '@/components/ui';
import {
  PAYMENT_STATUSES,
  formatMoney,
  getPaymentTransactions,
  paymentStats,
  paymentStatusLabel,
  paymentTypeLabel,
  updatePaymentStatus,
  type PaymentStatus,
  type PaymentTransaction,
  type PaymentType,
} from '@/lib/payments';

type QuickFilter = 'all' | 'penalties' | 'payouts' | 'pending';

function StatTile({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string;
  tone: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-[92px] flex-col justify-center gap-1.5 rounded-card border bg-white px-4 text-left transition hover:border-brand/40 sm:h-[110px] sm:gap-2 sm:px-6',
        active ? 'border-brand' : 'border-line',
      )}
    >
      <span className="text-[13.5px] text-muted">{label}</span>
      <span className={cn('text-[22px] leading-9 font-bold sm:text-[27px]', tone)}>{value}</span>
    </button>
  );
}

export default function PaymentPage() {
  const toast = useToast();
  const [list, setList] = useState<PaymentTransaction[]>(() => getPaymentTransactions());
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | PaymentStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | PaymentType>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => paymentStats(list), [list]);

  useEffect(() => {
    if (!filterOpen) return;
    const close = (e: MouseEvent) => !filterRef.current?.contains(e.target as Node) && setFilterOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [filterOpen]);

  const applyQuickFilter = (key: QuickFilter) => {
    setQuickFilter(key);
    setSelected(new Set());
    if (key === 'all') {
      setStatus('all');
      setTypeFilter('all');
      return;
    }
    if (key === 'penalties') {
      setStatus('all');
      setTypeFilter('penalty');
      return;
    }
    if (key === 'payouts') {
      setStatus('completed');
      setTypeFilter('payout');
      return;
    }
    setStatus('pending');
    setTypeFilter('all');
  };

  const setStatusFilter = (next: 'all' | PaymentStatus) => {
    setStatus(next);
    setQuickFilter('all');
    if (next === 'all') setTypeFilter('all');
    setFilterOpen(false);
    setSelected(new Set());
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter(
      (t) =>
        (status === 'all' || t.status === status) &&
        (typeFilter === 'all' || t.type === typeFilter) &&
        (!needle ||
          [t.txnId, t.userName, t.jobIdLabel, t.method, paymentTypeLabel(t.type), paymentStatusLabel(t.status), formatMoney(t.amount)]
            .join(' ')
            .toLowerCase()
            .includes(needle)),
    );
  }, [list, q, status, typeFilter]);

  const changeStatus = async (t: PaymentTransaction, next: PaymentStatus) => {
    if (next === t.status) return;
    setStatusBusy(t.id);
    try {
      await updatePaymentStatus(t.id, next);
      setList(getPaymentTransactions());
      toast.success(`Transaction ${t.txnId} updated to ${paymentStatusLabel(next)}.`);
    } catch (e) {
      toast.error((e as Error).message || 'Could not update status.');
    } finally {
      setStatusBusy(null);
    }
  };

  const exportCsv = () => {
    const pick = selected.size ? filtered.filter((r) => selected.has(r.id)) : filtered;
    if (pick.length === 0) {
      toast.error('No transactions to export.');
      return;
    }
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Transaction ID', 'User', 'Job ID', 'Type', 'Amount', 'Method', 'Status', 'Last Update'];
    const lines = pick.map((t) =>
      [
        t.txnId,
        t.userName,
        t.jobIdLabel,
        paymentTypeLabel(t.type),
        formatMoney(t.amount),
        t.method,
        paymentStatusLabel(t.status),
        t.lastUpdate,
      ]
        .map(esc)
        .join(','),
    );
    const blob = new Blob([[head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kd-ascend-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      selected.size
        ? `Exported ${pick.length} selected transaction${pick.length === 1 ? '' : 's'} to CSV.`
        : `Exported ${pick.length} transaction${pick.length === 1 ? '' : 's'} to CSV.`,
    );
  };

  return (
    <PageShell>
      <PageTitle title="Payment Management" subtitle="Track payouts, penalties, and transaction status" />

      <div className="grid grid-cols-1 gap-3 sm:gap-[22.5px] md:grid-cols-3">
        <StatTile
          label="Total Penalties"
          value={formatMoney(stats.totalPenalties)}
          tone="text-success"
          active={quickFilter === 'penalties'}
          onClick={() => applyQuickFilter('penalties')}
        />
        <StatTile
          label="Total Payouts"
          value={formatMoney(stats.totalPayouts)}
          tone="text-[#7c3aed]"
          active={quickFilter === 'payouts'}
          onClick={() => applyQuickFilter('payouts')}
        />
        <StatTile
          label="Pending Payout"
          value={formatMoney(stats.pendingPayout)}
          tone="text-brand"
          active={quickFilter === 'pending'}
          onClick={() => applyQuickFilter('pending')}
        />
      </div>

      <Card pad="default" className="flex flex-wrap items-center gap-[13.5px]">
        <div className="relative w-full min-w-0 flex-1 sm:w-auto sm:min-w-[220px]">
          <Search className="pointer-events-none absolute top-1/2 left-[18px] size-5 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search transactions by ID, user, job, or method..."
            className={cn(
              'w-full rounded-control border border-field pr-10 pl-[50px] outline-none placeholder:text-[#0a0a0a]/50 focus:border-brand focus:ring-2 focus:ring-brand/15',
              ui.toolbarControl,
            )}
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-page"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="relative" ref={filterRef}>
          <Button variant="outline" onClick={() => setFilterOpen((o) => !o)} className={ui.toolbarControl}>
            <Filter className="size-[18px]" />
            {status === 'all' ? 'Filter' : paymentStatusLabel(status)}
          </Button>
          {filterOpen ? (
            <div className="absolute left-0 z-20 mt-2 w-52 rounded-control sm:right-0 sm:left-auto border border-line bg-white py-1.5 shadow-lg">
              {[{ value: 'all' as const, label: 'All statuses' }, ...PAYMENT_STATUSES].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatusFilter(s.value)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-[14.5px] text-ink hover:bg-page"
                >
                  {s.label}
                  {status === s.value ? <Check className="size-4 text-brand" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Button
          variant="outline"
          onClick={exportCsv}
          className={ui.toolbarControl}
          title={selected.size ? 'Export selected transactions' : 'Export the transactions shown'}
        >
          <Download className="size-[18px]" />
          Export{selected.size ? ` (${selected.size})` : ''}
        </Button>
      </Card>

      <Card className="overflow-hidden">
        <PaymentsTable
          transactions={filtered}
          selected={selected}
          onSelectedChange={setSelected}
          onStatusChange={changeStatus}
          statusBusy={statusBusy}
          emptyText={list.length === 0 ? 'No transactions yet.' : 'No transactions match your search.'}
        />
      </Card>
    </PageShell>
  );
}