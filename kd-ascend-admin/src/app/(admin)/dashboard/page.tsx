'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Clock, TrendingDown, TrendingUp, UserCheck, Users } from 'lucide-react';
import { Card, ErrorNote, FullPageSpinner, cn } from '@/components/ui';
import UsersTable from '@/components/UsersTable';
import SignupsChart from '@/components/SignupsChart';
import { useUsersData } from '@/context/UsersData';
import { toDate } from '@/lib/format';
import { subscribeCorporates } from '@/lib/corporates';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function Trend({ value, suffix = '' }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold',
        up ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
      )}
    >
      {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {up ? '+' : ''}
      {value}
      {suffix}
    </span>
  );
}

function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
  note,
  href,
}: {
  icon: React.ElementType;
  iconClass: string;
  label: string;
  value: number;
  note?: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className="block rounded-card border border-line bg-white p-[22.5px] transition hover:border-brand/40">
      <div className="flex items-start justify-between gap-2">
        <span className={cn('grid size-[45px] place-items-center rounded-control', iconClass)}>
          <Icon className="size-[22px]" strokeWidth={1.8} />
        </span>
        {note}
      </div>
      <p className="mt-[18px] text-[13.5px] font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-[27px] leading-9 font-bold text-ink">{value.toLocaleString()}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const { users, loading, error, counts } = useUsersData();
  const [activeCorporates, setActiveCorporates] = useState(0);
  useEffect(
    () =>
      subscribeCorporates(
        (list) => setActiveCorporates(list.filter((c) => c.status === 'active').length),
        () => setActiveCorporates(0),
      ),
    [],
  );

  const { monthly, monthChange, newThisMonth } = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], value: 0 };
    });
    users.forEach((u) => {
      const d = toDate(u.createdAt);
      if (!d) return;
      const b = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (b) b.value += 1;
    });
    const cur = buckets[5].value;
    const prev = buckets[4].value;
    const change = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
    return { monthly: buckets.map(({ label, value }) => ({ label, value })), monthChange: change, newThisMonth: cur };
  }, [users]);

  const statusBars = [
    { label: 'Pending Approval', sub: 'Waiting for review', value: counts.under_review, bar: 'bg-brand', href: '/users?status=under_review' },
    { label: 'Active', sub: 'Approved users', value: counts.approved, bar: 'bg-success', href: '/users?status=approved' },
    { label: 'Blacklisted', sub: 'Blocked from the app', value: counts.blacklisted, bar: 'bg-navy', href: '/users?status=blacklisted' },
    { label: 'Rejected', sub: 'Applications declined', value: counts.rejected, bar: 'bg-danger', href: '/users?status=rejected' },
    { label: 'Incomplete', sub: 'Sign-up not finished', value: counts.incomplete, bar: 'bg-muted/50', href: '/users?status=incomplete' },
  ];

  if (loading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-[27px]">
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div className="grid gap-[22.5px] sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          iconClass="bg-brand/10 text-brand"
          label="Total Users"
          value={counts.total}
          href="/users"
          note={<Trend value={newThisMonth} suffix=" this month" />}
        />
        <StatCard icon={Building2} iconClass="bg-navy/10 text-navy" label="Active Corporates" value={activeCorporates} href="/corporates" />
        <StatCard icon={Clock} iconClass="bg-brand/10 text-brand" label="Pending Approval" value={counts.under_review} href="/users?status=under_review" />
        <StatCard icon={UserCheck} iconClass="bg-success/10 text-success" label="Active Users" value={counts.approved} href="/users?status=approved" />

      </div>

      <div className="grid gap-[27px] xl:grid-cols-2">
        <Card className="p-4 sm:p-[22.5px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Sign-ups Overview</h2>
              <p className="text-[13.5px] text-muted">Last 6 months</p>
            </div>
            <Trend value={monthChange} suffix="%" />
          </div>
          <div className="mt-4">
            <SignupsChart data={monthly} />
          </div>
        </Card>

        <Card className="p-4 sm:p-[22.5px]">
          <h2 className="text-lg font-bold text-ink">Users by Status</h2>
          <p className="text-[13.5px] text-muted">Where every account stands</p>
          <div className="mt-6 flex flex-col gap-[18px]">
            {statusBars.map((s) => {
              const pct = counts.total ? Math.round((s.value / counts.total) * 100) : 0;
              return (
                <Link key={s.label} href={s.href} className="group block">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[15.8px] font-semibold text-ink group-hover:text-brand">{s.label}</p>
                      <p className="text-[12px] text-muted">
                        {s.value} user{s.value === 1 ? '' : 's'} · {s.sub}
                      </p>
                    </div>
                    <span className="text-[13.5px] font-semibold text-ink">{pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className={cn('h-full rounded-full', s.bar)} style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-[22.5px]">
          <div>
            <h2 className="text-lg font-bold text-ink">Recent Users</h2>
            <p className="text-[13.5px] text-muted">Latest registrations</p>
          </div>
          <Link href="/users" className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-brand hover:underline">
            View All <ArrowRight className="size-4" />
          </Link>
        </div>
        <UsersTable users={users.slice(0, 5)} selectable={false} emptyText="No users yet. New sign-ups from the app appear here." />
      </Card>
    </div>
  );
}
