'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, CircleCheck, FileText, Plus, Search, ShieldBan, TrendingDown, TrendingUp, UserRound } from 'lucide-react';
import { Button, Card, Modal, ModalClose, ShortText, TextArea, cn } from './ui';
import { useUsersData } from '@/context/UsersData';
import { addToBlacklist, removeFromBlacklist, type Corporate } from '@/lib/corporates';
import { displayName, toDate, userCode } from '@/lib/format';
import type { UserDoc } from '@/lib/types';

/* ---------- Tabs (Figma "Corporates Detail" / "Overview") ---------- */

export type CorporateTab = 'overview' | 'blacklist';

export function CorporateTabs({ tab, onChange, blacklisted }: { tab: CorporateTab; onChange: (t: CorporateTab) => void; blacklisted: number }) {
  const items: { key: CorporateTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'blacklist', label: `Blacklist Users${blacklisted ? ` (${blacklisted})` : ''}` },
  ];
  return (
    <div role="tablist" aria-label="Corporate sections" className="flex gap-3 sm:gap-5">
      {items.map((it) => {
        const on = it.key === tab;
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.key)}
            className={cn(
              'min-w-[120px] border-b-2 px-4 pb-2 pt-1 text-center text-[14px] font-semibold whitespace-nowrap transition sm:min-w-[150px]',
              on ? 'border-brand text-brand' : 'border-line text-muted hover:border-brand/40 hover:text-ink',
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Overview ---------- */

const PERIODS = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
];

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-md px-2 text-[12px] font-semibold',
        up ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
      )}
    >
      {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  note,
  delta = null,
}: {
  icon: typeof UserRound;
  tone: string;
  label: string;
  value: number;
  note?: string;
  delta?: number | null;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4 sm:p-5">
      <span className={cn('grid size-10 place-items-center rounded-control', tone)}>
        <Icon className="size-5" />
      </span>
      <span className="text-[12.5px] font-semibold tracking-wide text-muted uppercase">{label}</span>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[26px] leading-8 font-bold text-ink sm:text-[30px] sm:leading-9">{value.toLocaleString()}</p>
          {note ? <p className="mt-0.5 text-[12px] text-muted">{note}</p> : null}
        </div>
        <Delta value={delta} />
      </div>
    </Card>
  );
}

/** New app sign-ups per month for the last 7 months, drawn as an SVG line chart. */
function ActivityChart({ users }: { users: UserDoc[] }) {
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const count = users.filter((u) => {
        const t = toDate(u.createdAt);
        return t && t >= d && t < next;
      }).length;
      return { label: d.toLocaleString('en-US', { month: 'short' }), count };
    });
  }, [users]);

  const W = 560;
  const H = 220;
  const pad = { l: 34, r: 10, t: 10, b: 26 };
  const max = Math.max(4, ...months.map((m) => m.count));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (months.length - 1);
  const y = (v: number) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const line = months.map((m, i) => `${i ? 'L' : 'M'}${x(i)},${y(m.count)}`).join(' ');
  const area = `${line} L${x(months.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="New user registrations per month">
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k}>
          <line x1={pad.l} x2={W - pad.r} y1={y(k * step)} y2={y(k * step)} stroke="#EEF0F3" />
          <text x={pad.l - 8} y={y(k * step) + 4} textAnchor="end" fontSize="11" fill="#9CA3AF">
            {k * step}
          </text>
        </g>
      ))}
      <path d={area} fill="#FF8241" fillOpacity="0.1" />
      <path d={line} fill="none" stroke="#FF8241" strokeWidth="2.5" strokeLinejoin="round" />
      {months.map((m, i) => (
        <g key={m.label + i}>
          <circle cx={x(i)} cy={y(m.count)} r="4.5" fill="#fff" stroke="#FF8241" strokeWidth="2">
            <title>{`${m.label}: ${m.count} sign-up${m.count === 1 ? '' : 's'}`}</title>
          </circle>
          <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#9CA3AF">
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function OverviewTab({ corporate }: { corporate: Corporate }) {
  const { users } = useUsersData();
  const [days, setDays] = useState(30);

  const blocked = useMemo(() => new Set(Object.keys(corporate.blacklist ?? {})), [corporate.blacklist]);
  // Users who can see this corporate's jobs: approved in the app and not on its blacklist.
  const eligible = useMemo(() => users.filter((u) => u.status === 'approved' && !blocked.has(u.uid)), [users, blocked]);

  const delta = useMemo(() => {
    const now = Date.now();
    const span = days * 86_400_000;
    const inRange = (from: number, to: number) =>
      eligible.filter((u) => {
        const t = (toDate(u.approvedAt) ?? toDate(u.createdAt))?.getTime();
        return t !== undefined && t >= from && t < to;
      }).length;
    const current = inRange(now - span, now);
    const previous = inRange(now - 2 * span, now - span);
    if (!previous) return current ? 100 : null;
    return ((current - previous) / previous) * 100;
  }, [eligible, days]);

  const active = corporate.activeJobs ?? 0;
  const completed = corporate.completedJobs ?? 0;
  const jobStatus = [
    { label: 'Published', value: active, bar: 'bg-brand', text: 'text-brand' },
    { label: 'In Review', value: 0, bar: 'bg-[#3B6FD1]', text: 'text-[#3B6FD1]' },
    { label: 'Closed', value: completed, bar: 'bg-success', text: 'text-success' },
    { label: 'Draft', value: 0, bar: 'bg-muted/50', text: 'text-muted' },
  ];
  const totalJobs = jobStatus.reduce((n, s) => n + s.value, 0);
  const pct = (v: number) => (totalJobs ? Math.round((v / totalJobs) * 100) : 0);
  const periodLabel = PERIODS.find((p) => p.days === days)?.label.toLowerCase() ?? '';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-bold text-ink sm:text-[22px]">Overview</h2>
        <select
          aria-label="Period"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="h-9 rounded-control border border-line bg-white px-3 text-[13.5px] text-ink"
        >
          {PERIODS.map((p) => (
            <option key={p.days} value={p.days}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={UserRound}
          tone="bg-brand/10 text-brand"
          label="Total Users"
          value={eligible.length}
          note={`vs. previous ${periodLabel.replace('last ', '')}`}
          delta={delta}
        />
        <StatCard icon={FileText} tone="bg-[#3B6FD1]/10 text-[#3B6FD1]" label="Total Jobs" value={active + completed} note="Active + completed" />
        <StatCard icon={CircleCheck} tone="bg-success/10 text-success" label="Active Jobs" value={active} note="Open right now" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-semibold text-ink">User Activity</h3>
              <p className="text-[12.5px] text-muted">New user registrations over time</p>
            </div>
            <span className="rounded-control bg-page px-3 py-1.5 text-[12px] text-muted">Last 7 months</span>
          </div>
          <div className="mt-4">
            <ActivityChart users={users} />
          </div>
        </Card>

        <Card className="flex min-w-0 flex-col p-4 sm:p-5">
          <h3 className="text-[16px] font-semibold text-ink">Job Status</h3>
          <p className="text-[12.5px] text-muted">Current job distribution</p>
          <ul className="mt-5 flex flex-1 flex-col gap-5">
            {jobStatus.map((s) => (
              <li key={s.label}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-ink">{s.label}</span>
                  <span className={cn('font-semibold', s.text)}>{pct(s.value)}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-page">
                  <div className={cn('h-2 rounded-full', s.bar)} style={{ width: `${pct(s.value)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[13px]">
            <span className="text-muted">Total active listings</span>
            <b className="text-[18px] text-ink">{active}</b>
          </div>
          {!totalJobs ? <p className="mt-2 text-[12px] text-muted">No jobs yet. These fill in once the Jobs module is live.</p> : null}
        </Card>
      </div>
    </div>
  );
}

/* ---------- Blacklist Users ---------- */

const PAGE = 10;

type Row = { uid: string; user: UserDoc | null; reason: string; at: Date | null };

export function BlacklistTab({ corporate }: { corporate: Corporate }) {
  const { users } = useUsersData();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [unblocking, setUnblocking] = useState<Row | null>(null);
  const [done, setDone] = useState<SuccessInfo | null>(null);

  const rows: Row[] = useMemo(() => {
    const byUid = new Map(users.map((u) => [u.uid, u]));
    return Object.entries(corporate.blacklist ?? {})
      .map(([uid, e]) => ({ uid, user: byUid.get(uid) ?? null, reason: e.reason || '—', at: toDate(e.addedAt) }))
      .sort((a, b) => (b.at?.getTime() ?? Date.now()) - (a.at?.getTime() ?? Date.now()));
  }, [corporate.blacklist, users]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * PAGE, current * PAGE);
  const name = (r: Row) => (r.user ? displayName(r.user) : 'Deleted user');
  const code = (r: Row) => (r.user ? userCode(r.user) : '—');
  const day = (d: Date | null) => (d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[20px] font-bold text-ink sm:text-[22px]">Blacklist Users ({rows.length})</h2>
          <p className="mt-1 text-[14px] text-muted sm:text-[15px]">
            Users who are restricted from viewing or applying to jobs posted by this corporate.
          </p>
        </div>
        <Button onClick={() => setAdding(true)} className="h-10 w-full rounded-control px-4 text-[14px] font-semibold sm:w-auto">
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      <Card className="overflow-hidden rounded-[16px] border-0 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-brand/10 text-brand">
              <ShieldBan className="size-6" />
            </span>
            <p className="mt-3 font-semibold text-ink">No blacklisted users</p>
            <p className="mt-1 text-[14px] text-muted">Use “Add User” to stop someone from seeing this corporate’s jobs.</p>
          </div>
        ) : (
          <>
            {/* Computers and tablets: table */}
            <table className="hidden w-full text-left md:table">
              <caption className="sr-only">Blacklisted users: user ID, name, date added, reason, action</caption>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.uid} className="border-b border-line text-[13.5px] last:border-0">
                    <td className="py-5 pr-3 pl-6 font-semibold text-ink">{code(r)}</td>
                    <td className="px-3 py-5 font-semibold text-ink">
                      {r.user ? (
                        <Link href={`/users/${r.uid}`} className="hover:text-brand hover:underline">
                          {name(r)}
                        </Link>
                      ) : (
                        name(r)
                      )}
                    </td>
                    <td className="px-3 py-5 whitespace-nowrap text-ink/80">{day(r.at)}</td>
                    <td className="max-w-[320px] px-3 py-5 text-ink/80">
                      <span className="line-clamp-2">{r.reason}</span>
                    </td>
                    <td className="py-5 pr-6 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => setUnblocking(r)}
                        className="rounded-full px-3 py-1 text-[13px] font-semibold text-brand transition hover:bg-brand/10"
                      >
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phones: one card per user */}
            <ul className="divide-y divide-line md:hidden">
              {shown.map((r) => (
                <li key={r.uid} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-muted">{code(r)}</p>
                    <ShortText text={name(r)} className="block text-[15px] font-semibold text-ink" />
                    <p className="mt-1 text-[13px] text-muted">{r.reason}</p>
                    <p className="mt-1 text-[12px] text-muted">{day(r.at)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUnblocking(r)}
                    className="rounded-full bg-brand/10 px-3 py-1 text-[13px] font-semibold text-brand"
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {rows.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
          <span>
            Showing {(current - 1) * PAGE + 1}–{Math.min(current * PAGE, rows.length)} of {rows.length}
          </span>
          {rows.length ? (
            <div className="flex gap-1.5">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-current={n === current ? 'page' : undefined}
                  className={cn(
                    'grid size-8 place-items-center rounded-md text-[13px] font-medium',
                    n === current ? 'bg-brand/20 text-brand ring-1 ring-brand/40' : 'bg-brand/10 text-brand/80 hover:bg-brand/15',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <AddBlacklistModal
        open={adding}
        corporate={corporate}
        onClose={() => setAdding(false)}
        onDone={(u) => {
          setAdding(false);
          setDone({
            title: 'User Blacklisted Successfully',
            message: `${displayName(u)} (${userCode(u)}) has been successfully blacklisted from ${corporate.name}.`,
            note: 'The user can no longer view or apply for jobs posted by this corporate.',
          });
        }}
      />
      <UnblockDialog
        row={unblocking}
        corporate={corporate}
        label={unblocking ? `${name(unblocking)} (${code(unblocking)})` : ''}
        onClose={() => setUnblocking(null)}
        onDone={(label) => {
          setUnblocking(null);
          setDone({
            title: 'User Unblocked Successfully',
            message: `${label} has been removed from the blacklist for ${corporate.name}.`,
            note: 'The user can now view and apply for jobs posted by this corporate again.',
          });
        }}
      />
      <SuccessModal info={done} onClose={() => setDone(null)} />
    </div>
  );
}

/* ---------- Modals (Figma "Add/Blacklist User Modal", "User Blacklisted Confirmation", "… Successfully") ---------- */

function AddBlacklistModal({
  open,
  corporate,
  onClose,
  onDone,
}: {
  open: boolean;
  corporate: Corporate;
  onClose: () => void;
  onDone: (u: UserDoc) => void;
}) {
  const { users } = useUsersData();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<UserDoc | null>(null);
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setQ('');
    setPicked(null);
    setReason('');
    setConfirm(false);
    setBusy(false);
    setError(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const blocked = corporate.blacklist ?? {};
    return users
      .filter((u) => !blocked[u.uid])
      .filter(
        (u) => !needle || [displayName(u), u.email, u.phone, userCode(u)].some((v) => (v ?? '').toLowerCase().includes(needle)),
      )
      .slice(0, 20);
  }, [q, users, corporate.blacklist]);

  const submit = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      await addToBlacklist(corporate.id, picked.uid, reason || 'Restricted by admin');
      const u = picked;
      reset();
      onDone(u);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} className={confirm ? CONFIRM_BOX : 'max-w-[480px]'}>
      {confirm ? null : <ModalClose onClose={close} />}
      {confirm && picked ? (
        <ConfirmBody
          title="Blacklist User?"
          lead="Are you sure you want to blacklist"
          who={`${displayName(picked)} (${userCode(picked)})`}
          after="from viewing jobs posted by"
          place={`${corporate.name}?`}
          note="The user will no longer be able to view or apply for its jobs."
          cancelLabel="Cancel"
          confirmLabel="Blacklist User"
          busy={busy}
          error={error}
          onCancel={() => setConfirm(false)}
          onConfirm={submit}
        />
      ) : (
        <div className="px-5 pt-6 pb-5 sm:px-7 sm:pt-7">
          <h2 className="pr-8 text-[20px] font-bold text-ink">Blacklist User</h2>
          <p className="mt-1 text-[14px] text-muted">Select a user to restrict from this corporate’s jobs.</p>

          <label className="mt-5 block text-[14px] font-semibold text-ink" htmlFor="bl-search">
            Select User
          </label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              id="bl-search"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search user..."
              className="h-11 w-full rounded-control border border-field bg-white pr-3 pl-9 text-[14.5px] outline-none focus:border-brand"
            />
          </div>
          <ul role="radiogroup" aria-label="Users" className="mt-2 max-h-[230px] overflow-y-auto">
            {matches.length === 0 ? (
              <li className="px-3 py-4 text-center text-[13.5px] text-muted">
                {q.trim() ? 'No matching users.' : 'No users to add.'}
              </li>
            ) : (
              matches.map((u) => {
                const on = picked?.uid === u.uid;
                return (
                  <li key={u.uid}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setPicked(u)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-control px-2 py-2.5 text-left hover:bg-page',
                        on && 'bg-brand/5',
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-[18px] shrink-0 place-items-center rounded-full border-2',
                          on ? 'border-brand' : 'border-field',
                        )}
                      >
                        {on ? <span className="size-2 rounded-full bg-brand" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-ink">{displayName(u)}</span>
                        <span className="block truncate text-[12px] text-muted">
                          {userCode(u)} • {u.email || u.phone}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <label className="mt-4 block text-[14px] font-semibold text-ink" htmlFor="bl-reason">
            Remarks
          </label>
          <TextArea
            id="bl-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for blacklisting..."
            className="mt-2"
          />

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="outline" className="h-11 w-full rounded-full sm:flex-1" onClick={close}>
              Cancel
            </Button>
            <Button className="h-11 w-full rounded-full sm:flex-1" disabled={!picked} onClick={() => setConfirm(true)}>
              Add to Blacklist
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function UnblockDialog({
  row,
  corporate,
  label,
  onClose,
  onDone,
}: {
  row: Row | null;
  corporate: Corporate;
  label: string;
  onClose: () => void;
  onDone: (label: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      await removeFromBlacklist(corporate.id, row.uid);
      onDone(label);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const [who, place] = label ? [label, `${corporate.name}?`] : ['', ''];
  return (
    <Modal open={!!row} onClose={onClose} className={CONFIRM_BOX}>
      <ConfirmBody
        title="Unblock User?"
        lead="Are you sure you want to remove"
        who={who}
        after="from the blacklist for"
        place={place}
        note="The user will be able to view and apply for its jobs again."
        cancelLabel="Cancel"
        confirmLabel="Unblock User"
        busy={busy}
        error={error}
        onCancel={onClose}
        onConfirm={go}
      />
    </Modal>
  );
}

/* Figma "unblock" / "User Blacklisted Confirmation" and "Unblock Successfully" / "User Blacklisted Successfully". */

type SuccessInfo = { title: string; message: string; note?: string };

const CONFIRM_BOX = 'max-w-[444px] rounded-[10px]';

function ConfirmBody({
  title,
  lead,
  who,
  after,
  place,
  note,
  cancelLabel,
  confirmLabel,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  title: string;
  lead: string;
  who: string;
  after: string;
  place: string;
  note: string;
  cancelLabel: string;
  confirmLabel: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 pt-8 pb-[34px] text-center sm:px-10">
      <span className="grid size-16 place-items-center rounded-full bg-[#F2F2F2] text-[22px] font-semibold text-[#3F3F3F]" aria-hidden>
        ?
      </span>
      <h2 className="mt-3 text-[20px] leading-7 font-semibold text-ink">{title}</h2>
      <p className="mt-3 text-[13px] leading-5 text-[#5E5E5E]">{lead}</p>
      <p className="text-[13px] leading-5 font-medium text-ink">{who}</p>
      <p className="mt-2 text-[12px] leading-[18px] text-[#5E5E5E]">
        {after} {place}
        <br />
        {note}
      </p>
      {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}
      <div className="mt-10 flex w-full flex-col-reverse justify-center gap-3 sm:flex-row sm:gap-[30px]">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-[50px] w-full rounded-full border border-[#E3E3E3] bg-white text-[16px] text-ink transition hover:bg-page disabled:opacity-60 sm:w-[144px]"
        >
          {cancelLabel}
        </button>
        <Button onClick={onConfirm} loading={busy} className="h-[50px] w-full rounded-full text-[16px] font-medium sm:w-[144px]">
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

function SuccessModal({ info, onClose }: { info: SuccessInfo | null; onClose: () => void }) {
  return (
    <Modal open={!!info} onClose={onClose} className={CONFIRM_BOX}>
      <div className="flex flex-col items-center px-6 pt-9 pb-[34px] text-center sm:px-10">
        <span className="grid size-[82px] place-items-center rounded-full bg-[#E3F5EC]" aria-hidden>
          <span className="grid size-[54px] place-items-center rounded-full bg-[#0E9F6E] text-white">
            <Check className="size-8" strokeWidth={3} />
          </span>
        </span>
        <h2 className="mt-4 text-[22px] leading-8 font-semibold text-ink">{info?.title}</h2>
        <p className="mt-2 max-w-[280px] text-[13.5px] leading-[22px] text-[#5E5E5E]">{info?.message}</p>
        {info?.note ? (
          <p className="mt-5 w-full max-w-[292px] rounded-[8px] bg-[#F7F7F8] px-5 py-3 text-[11.5px] leading-[18px] text-[#6B6B6B]">
            {info.note}
          </p>
        ) : null}
        <Button onClick={onClose} className="mt-7 h-10 w-[150px] rounded-full text-[16px] font-semibold">
          Done
        </Button>
      </div>
    </Modal>
  );
}
