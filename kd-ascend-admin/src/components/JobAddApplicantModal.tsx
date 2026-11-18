'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ban, ChevronRight, Clock, Search, UserPlus } from 'lucide-react';
import { Button, ErrorNote, Modal, ModalClose, Spinner, StatusBadge, TextInput, cn, ui } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { subscribeCorporateBlacklist } from '@/lib/corporateBlacklist';
import { addJobApplication, findApplicationTimeConflict } from '@/lib/jobApplications';
import { STATUS_LABEL, displayName, shortId } from '@/lib/format';
import { userMatches } from '@/lib/search';
import type { Job } from '@/lib/jobs';
import type { UserDoc } from '@/lib/types';
import { useUsersData } from '@/context/UsersData';

const SEARCH_MIN = 2;
const PICKER_LIMIT = 25;

function memberCode(u: UserDoc): string {
  const ext = u as UserDoc & { kdUserId?: string; memberId?: string };
  return ext.kdUserId ?? ext.memberId ?? shortId(u.uid);
}

export type JobApplicantExisting = {
  uids: Set<string>;
  emails: Set<string>;
  memberCodes: Set<string>;
};

function isAlreadyOnJob(u: UserDoc, onJob: JobApplicantExisting): boolean {
  if (onJob.uids.has(u.uid)) return true;
  const email = u.email.trim().toLowerCase();
  if (email && onJob.emails.has(email)) return true;
  const code = memberCode(u).trim().toLowerCase();
  return code ? onJob.memberCodes.has(code) : false;
}

function blockReason(
  u: UserDoc,
  job: Job,
  onJob: JobApplicantExisting,
  blacklistUids: Set<string>,
): string | null {
  if (u.status !== 'approved') {
    return u.status === 'blacklisted' ? 'Account blacklisted' : `Only active users can be added (${STATUS_LABEL[u.status]})`;
  }
  if (blacklistUids.has(u.uid)) return 'Blacklisted for this corporate';
  if (isAlreadyOnJob(u, onJob)) return 'Already on this job';
  const conflict = findApplicationTimeConflict(u.uid, job);
  if (conflict) return `Time conflict with ${conflict.title}`;
  return null;
}

function ApplicantPickerRow({
  user,
  disabled,
  hint,
  onPick,
}: {
  user: UserDoc;
  disabled?: boolean;
  hint?: string | null;
  onPick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onPick}
        className={cn(
          'group flex w-full items-center gap-3 rounded-control border border-field bg-white px-4 py-3.5 text-left transition',
          !disabled && 'hover:border-brand/40 hover:bg-brand/[0.04] hover:shadow-sm',
          'focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:outline-none',
          disabled && 'cursor-not-allowed opacity-75',
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
          {hint ? (
            <p className={cn('mt-2 flex items-center gap-1.5 text-[12.5px] font-medium', disabled ? 'text-danger' : 'text-brand')}>
              {hint.includes('Time conflict') ? <Clock className="size-3.5 shrink-0" /> : <Ban className="size-3.5 shrink-0" />}
              {hint}
            </p>
          ) : null}
        </div>
        {!disabled ? (
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full border border-line bg-page text-muted transition',
              'group-hover:border-brand/35 group-hover:bg-brand/10 group-hover:text-brand',
            )}
            aria-hidden
          >
            <ChevronRight className="size-4" strokeWidth={2.25} />
          </span>
        ) : null}
      </button>
    </li>
  );
}

export function JobAddApplicantModal({
  open,
  job,
  existingOnJob,
  onClose,
  onAdded,
}: {
  open: boolean;
  job: Job;
  existingOnJob: JobApplicantExisting;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { users, loading } = useUsersData();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blacklistUids, setBlacklistUids] = useState<Set<string>>(new Set());
  const [blacklistLoading, setBlacklistLoading] = useState(true);

  useEffect(() => {
    if (!open) {
      setQ('');
      setError(null);
      return;
    }
    setBlacklistLoading(true);
    const unsub = subscribeCorporateBlacklist(
      job.corporateId,
      (entries) => {
        setBlacklistUids(new Set(entries.map((e) => e.uid)));
        setBlacklistLoading(false);
      },
      () => {
        setBlacklistUids(new Set());
        setBlacklistLoading(false);
      },
    );
    return () => unsub();
  }, [open, job.corporateId]);

  const needle = q.trim();
  const searchReady = needle.length >= SEARCH_MIN;

  const { candidates, totalMatches } = useMemo(() => {
    if (!searchReady) return { candidates: [] as UserDoc[], totalMatches: 0 };
    const matched = users.filter((u) => userMatches(u, needle));
    return { candidates: matched.slice(0, PICKER_LIMIT), totalMatches: matched.length };
  }, [users, needle, searchReady]);

  const pick = async (u: UserDoc) => {
    const blocked = blockReason(u, job, existingOnJob, blacklistUids);
    if (blocked) return;
    setBusy(true);
    setError(null);
    try {
      await addJobApplication(job, {
        userUid: u.uid,
        uid: memberCode(u),
        name: displayName(u),
        email: u.email,
        phone: u.phone ?? '',
      });
      toast.success(`${displayName(u)} added as applicant.`);
      onAdded();
      onClose();
    } catch (e) {
      setError((e as Error).message);
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
          <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
            <UserPlus className="size-6" strokeWidth={2.25} />
          </span>
          <div>
            <h2 className={ui.sectionTitle}>Add applicant</h2>
            <p className={cn('mt-1 max-w-md', ui.sectionLead)}>
              Assign an active user to this job. Non-active, blacklisted, and conflicting event times cannot be added.
            </p>
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
          {matchLabel ? <p className="mb-2 px-1.5 text-[12.5px] font-medium text-muted">{matchLabel}</p> : null}
          <div className="max-h-[min(340px,48vh)] overflow-y-auto rounded-[11px]">
            {loading || blacklistLoading ? (
              <div className="grid place-items-center py-14">
                <Spinner className="size-7" />
              </div>
            ) : !searchReady ? (
              <p className="px-4 py-10 text-center text-[14px] text-muted">Type at least {SEARCH_MIN} characters to search.</p>
            ) : candidates.length === 0 ? (
              <p className="px-4 py-10 text-center text-[14px] text-muted">No users match your search.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {candidates.map((u) => {
                  const hint = blockReason(u, job, existingOnJob, blacklistUids);
                  return (
                    <ApplicantPickerRow
                      key={u.uid}
                      user={u}
                      disabled={!!hint || busy}
                      hint={hint}
                      onPick={() => pick(u)}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}