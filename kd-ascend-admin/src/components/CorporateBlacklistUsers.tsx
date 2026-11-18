'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Ban, ChevronRight, Plus, Search, UserRound } from 'lucide-react';
import { Button, Card, ErrorNote, Modal, ModalClose, Spinner, StatusBadge, TextInput, cn, ui } from '@/components/ui';
import { useUsersData } from '@/context/UsersData';
import {
  addCorporateBlacklist,
  removeCorporateBlacklist,
  subscribeCorporateBlacklist,
  type CorporateBlacklistEntry,
} from '@/lib/corporateBlacklist';
import { displayName, shortDay, shortId } from '@/lib/format';
import { userMatches } from '@/lib/search';
import type { UserDoc } from '@/lib/types';

const SEARCH_MIN = 2;
const PICKER_LIMIT = 25;

function memberCode(u: UserDoc): string {
  const ext = u as UserDoc & { kdUserId?: string; memberId?: string };
  return ext.kdUserId ?? ext.memberId ?? shortId(u.uid);
}

function firestoreHint(e: Error): string {
  return (e as { code?: string }).code === 'permission-denied'
    ? 'Permission denied. Deploy the latest Firestore rules (corporates/…/blacklistedUsers) from mobile-app/firestore.rules.'
    : e.message;
}

function PickerEmpty({ icon, title, detail }: { icon: ReactNode; title: string; detail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="grid size-[52px] place-items-center rounded-full bg-white text-muted shadow-sm ring-1 ring-line">{icon}</span>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {detail ? <p className="max-w-[300px] text-[13.5px] leading-relaxed text-muted">{detail}</p> : null}
    </div>
  );
}

function UserPickerRow({ user, disabled, onPick }: { user: UserDoc; disabled?: boolean; onPick: () => void }) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onPick}
        className={cn(
          'group flex w-full items-center gap-3 rounded-control border border-field bg-white px-4 py-3.5 text-left transition',
          'hover:border-brand/40 hover:bg-brand/[0.04] hover:shadow-sm',
          'focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:outline-none',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15.5px] font-semibold text-ink">{displayName(user)}</p>
              <p className="mt-1 truncate text-[13.5px] text-muted">{user.email}</p>
            </div>
            <StatusBadge status={user.status} className="shrink-0" />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
            <span className="inline-flex items-center rounded-md border border-line bg-page px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-ink">
              {memberCode(user)}
            </span>
            {user.phone ? <span className="truncate">{user.phone}</span> : null}
          </div>
        </div>
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full border border-line bg-page text-muted transition',
            'group-hover:border-brand/35 group-hover:bg-brand/10 group-hover:text-brand',
          )}
          aria-hidden
        >
          <ChevronRight className="size-4" strokeWidth={2.25} />
        </span>
      </button>
    </li>
  );
}

function AddUserModal({
  open,
  onClose,
  corporateId,
  existingUids,
}: {
  open: boolean;
  onClose: () => void;
  corporateId: string;
  existingUids: Set<string>;
}) {
  const { users, loading } = useUsersData();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQ('');
      setError(null);
    }
  }, [open]);

  const needle = q.trim();
  const searchReady = needle.length >= SEARCH_MIN;

  const { candidates, totalMatches } = useMemo(() => {
    if (!searchReady) return { candidates: [] as UserDoc[], totalMatches: 0 };
    const matched = users.filter((u) => !existingUids.has(u.uid) && userMatches(u, needle));
    return { candidates: matched.slice(0, PICKER_LIMIT), totalMatches: matched.length };
  }, [users, needle, existingUids, searchReady]);

  const pick = async (u: UserDoc) => {
    setBusy(true);
    setError(null);
    try {
      await addCorporateBlacklist(corporateId, {
        uid: u.uid,
        email: u.email,
        displayName: displayName(u),
        memberCode: memberCode(u),
      });
      onClose();
    } catch (e) {
      setError(firestoreHint(e as Error));
    } finally {
      setBusy(false);
    }
  };

  const matchLabel =
    !searchReady || candidates.length === 0
      ? null
      : totalMatches > PICKER_LIMIT
        ? `${PICKER_LIMIT} of ${totalMatches} matches`
        : totalMatches === 1
          ? '1 match'
          : `${totalMatches} matches`;

  return (
    <Modal open={open} onClose={onClose} className="max-w-[560px] overflow-hidden rounded-card border border-line shadow-brand/10">
      <ModalClose onClose={onClose} />
      <div className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-start gap-3 pr-10">
          <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-[#ffe2e2] text-danger">
            <Ban className="size-6" strokeWidth={2.25} />
          </span>
          <div>
            <h2 className={ui.sectionTitle}>Add user to blacklist</h2>
            <p className={cn('mt-1 max-w-md', ui.sectionLead)}>They will not see or apply to this corporate&apos;s jobs.</p>
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className={ui.fieldLabel}>Find user</span>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, phone, or user ID…"
              className="border-field bg-search pl-12 shadow-none"
              autoFocus
            />
          </div>
        </label>

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        <div className="rounded-control border border-line bg-page/90 p-2.5">
          {matchLabel ? (
            <p className="mb-2 px-1.5 text-[12.5px] font-medium text-muted">{matchLabel}</p>
          ) : null}
          <div className="max-h-[min(340px,48vh)] overflow-y-auto rounded-[11px]">
            {loading ? (
              <div className="grid place-items-center py-14">
                <Spinner className="size-7" />
              </div>
            ) : !searchReady ? (
              <PickerEmpty
                icon={<Search className="size-5" />}
                title="Search to get started"
                detail={`Type at least ${SEARCH_MIN} characters. We’ll show users who aren’t already on this corporate’s blacklist.`}
              />
            ) : candidates.length === 0 ? (
              <PickerEmpty
                icon={<UserRound className="size-5" />}
                title="No users found"
                detail={`Nothing matches “${needle}”. Try another name, email, or ID.`}
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {candidates.map((u) => (
                  <UserPickerRow key={u.uid} user={u} disabled={busy} onPick={() => pick(u)} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function CorporateBlacklistUsers({ corporateId }: { corporateId: string }) {
  const [entries, setEntries] = useState<CorporateBlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeCorporateBlacklist(
      corporateId,
      (list) => {
        setEntries(list);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(firestoreHint(e));
        setLoading(false);
      },
    );
    return () => unsub();
  }, [corporateId]);

  const existingUids = useMemo(() => new Set(entries.map((e) => e.uid)), [entries]);

  const unblock = async (uid: string) => {
    setUnblocking(uid);
    setError(null);
    try {
      await removeCorporateBlacklist(corporateId, uid);
    } catch (e) {
      setError(firestoreHint(e as Error));
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <Card pad="lg" className="min-h-[400px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={ui.sectionTitle}>Blacklist Users ({entries.length})</h2>
          <p className="mt-2 max-w-xl text-[15px] text-muted">
            Users who are restricted from viewing or applying to jobs posted by this corporate. This does not change their global account
            status on the Users page.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-[18px]" />
          Add User
        </Button>
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-card border border-line">
        {loading ? (
          <div className="grid min-h-[200px] place-items-center">
            <Spinner className="size-8" />
          </div>
        ) : entries.length === 0 ? (
          <PickerEmpty
            icon={<Ban className="size-5" />}
            title="No blacklisted users yet"
            detail="Use Add User to restrict someone from this corporate’s jobs."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="h-14 border-b border-line bg-page">
                  <th className={cn('px-[18px]', ui.tableHead)}>User</th>
                  <th className={cn('px-[18px]', ui.tableHead)}>User ID</th>
                  <th className={cn('px-[18px]', ui.tableHead)}>Email</th>
                  <th className={cn('px-[18px]', ui.tableHead)}>Date</th>
                  <th className={cn('px-[18px]', ui.tableHead)}>Reason</th>
                  <th className={cn('px-[18px] text-right', ui.tableHead)}>Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.uid} className="border-b border-line last:border-b-0">
                    <td className="px-[18px] py-4">
                      <Link href={`/users/${e.uid}`} className="font-medium text-ink hover:text-brand">
                        {e.displayName || '—'}
                      </Link>
                    </td>
                    <td className="px-[18px] py-4 font-mono text-[13.5px] text-muted">{e.memberCode || shortId(e.uid)}</td>
                    <td className="max-w-[200px] truncate px-[18px] py-4 text-[13.5px] text-muted" title={e.email}>
                      {e.email}
                    </td>
                    <td className="px-[18px] py-4 text-[13.5px] text-muted">{shortDay(e.createdAt)}</td>
                    <td className="px-[18px] py-4 text-[13.5px] text-muted">{e.reason}</td>
                    <td className="px-[18px] py-4 text-right">
                      <button
                        type="button"
                        disabled={unblocking === e.uid}
                        onClick={() => unblock(e.uid)}
                        className="text-[15px] font-semibold text-brand hover:underline disabled:opacity-50"
                      >
                        {unblocking === e.uid ? '…' : 'Unblock'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && entries.length > 0 ? (
        <p className="mt-4 text-[13.5px] text-muted">
          Showing 1–{entries.length} of {entries.length}
        </p>
      ) : null}

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} corporateId={corporateId} existingUids={existingUids} />
    </Card>
  );
}