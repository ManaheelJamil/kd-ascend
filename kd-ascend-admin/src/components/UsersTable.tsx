'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ban, ChevronDown, ShieldCheck, SquarePen } from 'lucide-react';
import { Avatar, IconButton, StatusBadge, cn } from './ui';
import { BlacklistDialog, RemoveBlacklistDialog } from './UserDialogs';
import { displayName, initial, isoDay, toDate } from '@/lib/format';
import type { UserDoc } from '@/lib/types';

type SortKey = 'name' | 'email' | 'phone' | 'status' | 'joined';

const COLUMNS: { key: SortKey | 'actions'; label: string; className: string }[] = [
  { key: 'name', label: 'User', className: 'w-[25%] pl-[51px]' },
  { key: 'email', label: 'Email', className: 'w-[15%]' },
  { key: 'phone', label: 'Contact', className: 'w-[15%]' },
  { key: 'status', label: 'Status', className: 'w-[15%] pl-[18px]' },
  { key: 'joined', label: 'Join Date', className: 'w-[15%] pl-[18px]' },
  { key: 'actions', label: 'Actions', className: 'w-[15%] pr-[18px] text-right' },
];

const sortValue = (u: UserDoc, key: SortKey): string | number => {
  switch (key) {
    case 'name':
      return displayName(u).toLowerCase();
    case 'email':
      return u.email?.toLowerCase() ?? '';
    case 'phone':
      return u.phone ?? '';
    case 'status':
      return u.status ?? '';
    case 'joined':
      return toDate(u.createdAt)?.getTime() ?? 0;
  }
};

export default function UsersTable({
  users,
  selectable = true,
  selected,
  onSelectedChange,
  emptyText = 'No users found.',
}: {
  users: UserDoc[];
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  emptyText?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'joined', dir: -1 });
  const [blacklistTarget, setBlacklistTarget] = useState<UserDoc | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<UserDoc | null>(null);

  const rows = useMemo(
    () =>
      [...users].sort((a, b) => {
        const va = sortValue(a, sort.key);
        const vb = sortValue(b, sort.key);
        return va < vb ? -sort.dir : va > vb ? sort.dir : 0;
      }),
    [users, sort],
  );

  const allChecked = !!selected && rows.length > 0 && rows.every((r) => selected.has(r.uid));
  const toggleAll = () => {
    if (!onSelectedChange) return;
    onSelectedChange(allChecked ? new Set() : new Set(rows.map((r) => r.uid)));
  };
  const toggle = (uid: string) => {
    if (!onSelectedChange || !selected) return;
    const next = new Set(selected);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    onSelectedChange(next);
  };

  const actions = (u: UserDoc) => (
    <div className="flex justify-end gap-1">
      <Link
        href={`/users/${u.uid}`}
        aria-label="View / edit"
        title="View / edit"
        className="grid size-[31px] place-items-center rounded-control text-muted transition hover:bg-page hover:text-ink"
      >
        <SquarePen className="size-[18px]" />
      </Link>
      {u.status === 'blacklisted' ? (
        <IconButton label="Remove from blacklist" onClick={() => setRestoreTarget(u)} className="text-success">
          <ShieldCheck className="size-[18px]" />
        </IconButton>
      ) : (
        <IconButton label="Blacklist user" onClick={() => setBlacklistTarget(u)} className="text-danger">
          <Ban className="size-[18px]" />
        </IconButton>
      )}
    </div>
  );

  return (
    <>
      {/* Phones: one card per user instead of the wide table. */}
      <ul className="divide-y divide-line md:hidden">
        {rows.length === 0 ? (
          <li className="px-4 py-12 text-center text-[15px] text-muted">{emptyText}</li>
        ) : (
          rows.map((u) => (
            <li
              key={u.uid}
              onClick={() => router.push(`/users/${u.uid}`)}
              className="flex cursor-pointer items-start gap-3 px-4 py-3.5 active:bg-page"
            >
              {selectable ? (
                <input
                  type="checkbox"
                  aria-label={`Select ${displayName(u)}`}
                  checked={selected?.has(u.uid) ?? false}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggle(u.uid)}
                  className="mt-3 size-5 shrink-0 rounded border-[#d9d9d9]"
                />
              ) : null}
              <Avatar letter={initial(u)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[15px] font-semibold text-ink">{displayName(u)}</p>
                  <StatusBadge status={u.status} />
                </div>
                <p className="truncate text-[13px] text-muted">{u.email}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="truncate text-[12.5px] text-muted">
                    {u.phone || '—'} · {isoDay(u.createdAt)}
                  </p>
                  <div onClick={(e) => e.stopPropagation()}>{actions(u)}</div>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
          <thead>
            <tr className="h-16 border-b border-line bg-page">
              {COLUMNS.map((col, i) => (
                <th key={col.key} className={cn('relative px-[18px] text-[13.5px] font-semibold text-muted', col.className)}>
                  {i === 0 && selectable ? (
                    <input
                      type="checkbox"
                      aria-label="Select all"
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
                      className="inline-flex items-center gap-0.5 hover:text-ink"
                    >
                      {col.label}
                      <ChevronDown
                        className={cn('size-5 transition', sort.key === col.key && sort.dir === -1 && 'rotate-180')}
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
              rows.map((u) => (
                <tr
                  key={u.uid}
                  onClick={() => router.push(`/users/${u.uid}`)}
                  className="h-[69px] cursor-pointer border-b border-line last:border-b-0 hover:bg-page/70"
                >
                  <td className="relative px-[18px] pl-[51px]">
                    {selectable ? (
                      <input
                        type="checkbox"
                        aria-label={`Select ${displayName(u)}`}
                        checked={selected?.has(u.uid) ?? false}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggle(u.uid)}
                        className="absolute top-1/2 left-[19px] size-5 -translate-y-1/2 rounded border-[#d9d9d9]"
                      />
                    ) : null}
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar letter={initial(u)} />
                      <span className="truncate text-[15.8px] font-medium text-ink">{displayName(u)}</span>
                    </div>
                  </td>
                  <td className="truncate px-1.5 text-[13.5px] text-muted" title={u.email}>
                    {u.email}
                  </td>
                  <td className="truncate px-1.5 text-[13.5px] text-muted">{u.phone || '—'}</td>
                  <td className="px-[18px]">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-[18px] text-[13.5px] text-muted">{isoDay(u.createdAt)}</td>
                  <td className="px-[18px]" onClick={(e) => e.stopPropagation()}>
                    {actions(u)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BlacklistDialog user={blacklistTarget} open={!!blacklistTarget} onClose={() => setBlacklistTarget(null)} />
      <RemoveBlacklistDialog user={restoreTarget} open={!!restoreTarget} onClose={() => setRestoreTarget(null)} />
    </>
  );
}
