'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, Download, Filter, Search, UserPlus, X } from 'lucide-react';
import { Avatar, Button, Card, ErrorNote, FullPageSpinner, PageTitle, cn } from '@/components/ui';
import UsersTable from '@/components/UsersTable';
import { useUsersData } from '@/context/UsersData';
import { STATUS_LABEL, displayName, initial, isoDay } from '@/lib/format';
import type { AccountStatus, StatusFilter, UserDoc } from '@/lib/types';

const FILTERS: StatusFilter[] = ['all', 'under_review', 'approved', 'rejected', 'blacklisted', 'incomplete'];

function matches(u: UserDoc, q: string) {
  if (!q) return true;
  const hay = [displayName(u), u.email, u.phone, u.profile?.nric].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q.toLowerCase());
}

function toCsv(users: UserDoc[]) {
  const head = ['Name', 'Email', 'Phone', 'Status', 'NRIC', 'Gender', 'Nationality', 'Date of Birth', 'Address', 'Joined'];
  const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const rows = users.map((u) =>
    [
      displayName(u),
      u.email,
      u.phone,
      STATUS_LABEL[u.status] ?? u.status,
      u.profile?.nric ?? '',
      u.profile?.gender ?? '',
      u.profile?.nationality ?? '',
      u.profile?.dateOfBirth ?? '',
      u.profile?.address ?? '',
      isoDay(u.createdAt),
    ]
      .map(esc)
      .join(','),
  );
  return [head.map(esc).join(','), ...rows].join('\n');
}

function StatTile({ label, value, tone, active, onClick }: { label: string; value: number; tone: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-[110px] flex-col justify-center gap-2 rounded-card border bg-white px-6 text-left transition hover:border-brand/40',
        active ? 'border-brand' : 'border-line',
      )}
    >
      <span className="text-[13.5px] text-muted">{label}</span>
      <span className={cn('text-[27px] leading-9 font-bold', tone)}>{value}</span>
    </button>
  );
}

function UsersPageInner() {
  const { users, loading, error, counts } = useUsersData();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = (params.get('status') as StatusFilter) || 'all';
  const [q, setQState] = useState(params.get('q') ?? '');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filterRef = useRef<HTMLDivElement>(null);

  // The search text lives in the URL (?q=) so this box and the header search stay in sync.
  const qParam = params.get('q') ?? '';
  useEffect(() => setQState(qParam), [qParam]);
  const setQ = (next: string) => {
    setQState(next);
    const sp = new URLSearchParams(params.toString());
    if (next.trim()) sp.set('q', next);
    else sp.delete('q');
    router.replace(`${pathname}${sp.toString() ? `?${sp}` : ''}`, { scroll: false });
  };

  useEffect(() => {
    if (!filterOpen) return;
    const close = (e: MouseEvent) => !filterRef.current?.contains(e.target as Node) && setFilterOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [filterOpen]);

  const setStatus = (next: StatusFilter) => {
    const sp = new URLSearchParams(params.toString());
    if (next === 'all') sp.delete('status');
    else sp.set('status', next);
    router.replace(`${pathname}${sp.toString() ? `?${sp}` : ''}`);
    setFilterOpen(false);
    setSelected(new Set());
  };

  const filtered = useMemo(
    () => users.filter((u) => (status === 'all' || u.status === status) && matches(u, q.trim())),
    [users, status, q],
  );
  const pending = useMemo(
    () => users.filter((u) => u.status === 'under_review' && matches(u, q.trim())),
    [users, q],
  );

  const exportCsv = () => {
    const list = selected.size ? filtered.filter((u) => selected.has(u.uid)) : filtered;
    const blob = new Blob([toCsv(list)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kd-ascend-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-[22.5px]">
      <PageTitle title="Users Management" subtitle="Manage student users and their profiles">
        <Link href="/users/new">
          <Button>
            <UserPlus className="size-[18px]" />
            Add User
          </Button>
        </Link>
      </PageTitle>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div className="grid grid-cols-2 gap-[22.5px] md:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Total Users" value={counts.total} tone="text-ink" active={status === 'all'} onClick={() => setStatus('all')} />
        <StatTile label="Active Users" value={counts.approved} tone="text-success" active={status === 'approved'} onClick={() => setStatus('approved')} />
        <StatTile label="Rejected Users" value={counts.rejected} tone="text-danger" active={status === 'rejected'} onClick={() => setStatus('rejected')} />
        <StatTile label="Blacklisted Users" value={counts.blacklisted} tone="text-navy" active={status === 'blacklisted'} onClick={() => setStatus('blacklisted')} />
        <StatTile label="Pending Approval" value={counts.under_review} tone="text-brand" active={status === 'under_review'} onClick={() => setStatus('under_review')} />
      </div>

      {pending.length > 0 && (status === 'all' || status === 'under_review') ? (
        <Card accent className="p-6">
          <h2 className="text-lg font-bold text-ink">
            Pending Approvals ({pending.length})
            {q.trim() ? <span className="ml-2 text-sm font-medium text-muted">matching “{q.trim()}”</span> : null}
          </h2>
          <div className="mt-5 flex max-h-[330px] flex-col gap-[9px] overflow-y-auto">
            {pending.map((u) => (
              <div key={u.uid} className="flex items-center gap-[13px] rounded-control border border-line px-[15px] py-[14.5px]">
                <Avatar letter={initial(u)} size={45} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15.8px] font-semibold text-ink">{displayName(u)}</p>
                  <p className="truncate text-[13.5px] text-muted">{u.email}</p>
                </div>
                <div className="hidden w-20 sm:block">
                  <p className="text-[13.5px] text-muted">Joined</p>
                  <p className="text-[13.5px] font-medium text-ink">{isoDay(u.createdAt)}</p>
                </div>
                <Link href={`/users/${u.uid}`}>
                  <Button size="sm">Review</Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="flex flex-wrap items-center gap-[13.5px] p-[22.5px]">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-[13px] size-[18px] -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone or NRIC..."
            className="h-[43px] w-full rounded-control border border-field pr-10 pl-10 text-[15.8px] outline-none placeholder:text-[#0a0a0a]/50 focus:border-brand"
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
          <Button variant="outline" onClick={() => setFilterOpen((o) => !o)} className="h-[43px]">
            <Filter className="size-[18px]" />
            {status === 'all' ? 'Filter' : STATUS_LABEL[status as AccountStatus]}
          </Button>
          {filterOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-52 rounded-control border border-line bg-white py-1.5 shadow-lg">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatus(f)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-[14.5px] text-ink hover:bg-page"
                >
                  {f === 'all' ? 'All users' : STATUS_LABEL[f]}
                  {status === f ? <Check className="size-4 text-brand" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Button variant="outline" onClick={exportCsv} className="h-[43px]" title={selected.size ? 'Export selected users' : 'Export the users shown'}>
          <Download className="size-[18px]" />
          Export{selected.size ? ` (${selected.size})` : ''}
        </Button>
      </Card>

      <Card className="overflow-hidden">
        <UsersTable
          users={filtered}
          selected={selected}
          onSelectedChange={setSelected}
          emptyText={users.length === 0 ? 'No users yet. Users appear here as soon as they sign up in the app.' : 'No users match your search.'}
        />
      </Card>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <UsersPageInner />
    </Suspense>
  );
}
