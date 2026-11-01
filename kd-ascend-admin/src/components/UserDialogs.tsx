'use client';

import { useEffect, useState } from 'react';
import { Ban, CircleCheck, CircleX, Trash2 } from 'lucide-react';
import { Button, Modal, TextArea } from './ui';
import { blacklistUser, deleteUser, rejectUser, removeFromBlacklist } from '@/lib/users';
import { displayName } from '@/lib/format';
import { RESUBMIT_FIELDS } from '@/lib/resubmit';
import type { UserDoc } from '@/lib/types';

type DialogProps = { user: UserDoc | null; open: boolean; onClose: () => void; onDone?: () => void };

function Header({ tone, icon, title, subtitle }: { tone: 'red' | 'green'; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-[13px]">
      <span className={`grid size-12 sm:size-[54px] shrink-0 place-items-center rounded-full ${tone === 'red' ? 'bg-[#ffe2e2] text-danger' : 'bg-[#dcfce7] text-success'}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-[20px] leading-7 font-bold text-ink sm:text-[22.5px] sm:leading-8">{title}</h2>
        <p className="text-[13.5px] text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

/**
 * "Fields the user must fix": ticked fields become editable in the app's Resubmit form;
 * everything else stays locked. Nothing ticked = the user can't resubmit.
 */
function FieldPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (key: string) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  return (
    <div className="mt-5">
      <p className="text-[15px] font-semibold text-ink">Fields the user must fix</p>
      <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted sm:text-[13px]">
        The user gets a Resubmit button in the app and can only change the ticked fields. Leave all unticked to block without a resubmit option.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {RESUBMIT_FIELDS.map((f) => {
          const on = value.includes(f.key);
          return (
            <label
              key={f.key}
              className={`flex cursor-pointer items-center gap-2 rounded-control border px-2.5 py-2 text-[13.5px] leading-[18px] transition sm:gap-2.5 sm:px-3 sm:py-2.5 sm:text-[14.5px] ${on ? 'border-brand bg-brand/5 text-ink' : 'border-field text-muted hover:bg-page'}`}
            >
              <input type="checkbox" checked={on} onChange={() => toggle(f.key)} className="size-4 shrink-0 accent-[#ff7d4d]" />
              {f.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function useAction(onClose: () => void, onDone?: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone?.();
      onClose();
    } catch (e) {
      setError((e as Error).message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}

/** "Blacklist User" — asks for a reason. */
export function BlacklistDialog({ user, open, onClose, onDone }: DialogProps) {
  const [reason, setReason] = useState('');
  const [fields, setFields] = useState<string[]>([]);
  const { busy, error, run, setError } = useAction(onClose, onDone);
  useEffect(() => {
    if (open) {
      setReason('');
      setFields([]);
      setError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose} className="flex max-h-[calc(100dvh-24px)] flex-col overflow-hidden sm:max-h-[calc(100dvh-32px)]">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-4 sm:px-8 sm:pt-8">
        <Header tone="red" icon={<Ban className="size-6" />} title="Blacklist User" subtitle="This action can be reversed later" />
        <p className="mt-[17px] text-base text-muted [overflow-wrap:anywhere] sm:text-lg">
          Are you sure you want to blacklist <b className="font-semibold text-ink">{displayName(user)}</b>? Please provide a reason.
        </p>
        <TextArea
          className="mt-5 h-[96px] rounded-card text-base sm:h-[120px] sm:text-lg"
          placeholder="Enter reason for blacklisting..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus={typeof window !== 'undefined' && window.innerWidth >= 640}
        />
        <FieldPicker value={fields} onChange={setFields} />
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-line px-5 py-4 sm:flex-row sm:px-8 sm:py-5">
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            loading={busy}
            disabled={!reason.trim()}
            onClick={() => run(() => blacklistUser(user.uid, reason, fields))}
          >
            Blacklist User
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} className="font-medium">
            Cancel
          </Button>
      </div>
    </Modal>
  );
}

/** "Delete User" — permanent; the admin types DELETE to confirm. */
export function DeleteUserDialog({ user, open, onClose, onDone }: DialogProps) {
  const [confirm, setConfirm] = useState('');
  const { busy, error, run, setError } = useAction(onClose, onDone);
  useEffect(() => {
    if (open) {
      setConfirm('');
      setError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return null;
  const ok = confirm.trim().toUpperCase() === 'DELETE';

  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose}>
      <div className="p-5 sm:p-8">
        <Header tone="red" icon={<Trash2 className="size-6" />} title="Delete User" subtitle="This can’t be undone" />
        <p className="mt-[17px] text-base text-muted [overflow-wrap:anywhere] sm:text-lg">
          Permanently delete <b className="font-semibold text-ink">{displayName(user)}</b>
          {user.email ? <> ({user.email})</> : null}? Their login, profile, documents and payment details are removed, and
          they’ll need to sign up again to use the app.
        </p>
        <label className="mt-5 block text-[15px] text-ink">
          Type <b>DELETE</b> to confirm
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoFocus
            className="mt-2 h-[52px] w-full rounded-control border border-field px-4 text-lg outline-none focus:border-danger"
            placeholder="DELETE"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            loading={busy}
            disabled={!ok}
            onClick={() => run(() => deleteUser(user.uid))}
          >
            Delete User
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} disabled={busy} className="font-medium">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** "Remove from Blacklist" confirmation. With showReason, also shows why the user was blacklisted. */
export function RemoveBlacklistDialog({ user, open, onClose, onDone, showReason }: DialogProps & { showReason?: boolean }) {
  const { busy, error, run } = useAction(onClose, onDone);
  if (!user) return null;
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-5 sm:p-8">
        {showReason ? (
          <>
            <Header tone="red" icon={<Ban className="size-6" />} title="Blacklist User" subtitle="This action can be reversed later" />
            <p className="mt-[17px] text-base text-muted [overflow-wrap:anywhere] sm:text-lg">
              <b className="font-semibold text-ink">{displayName(user)}</b> is Blacklisted. Provided reason:
            </p>
            <TextArea className="mt-5 h-[96px] rounded-card text-base sm:h-[120px] sm:text-lg" value={user.blacklistReason || 'No reason given.'} readOnly />
          </>
        ) : (
          <>
            <Header tone="green" icon={<CircleCheck className="size-6" />} title="Remove from Blacklist" subtitle="Restore user access" />
            <p className="mt-[17px] text-base text-muted [overflow-wrap:anywhere] sm:text-lg">
              Are you sure you want to remove <b className="font-semibold text-ink">{displayName(user)}</b> from the blacklist? They will be
              able to access the platform again.
            </p>
          </>
        )}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <Button variant="success" size="lg" className="flex-1" loading={busy} onClick={() => run(() => removeFromBlacklist(user.uid))}>
            Remove from Blacklist
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} className="font-medium">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** "Reject User" — reason is shown to the user in the app. */
export function RejectDialog({ user, open, onClose, onDone }: DialogProps) {
  const [reason, setReason] = useState('');
  const [fields, setFields] = useState<string[]>([]);
  const { busy, error, run, setError } = useAction(onClose, onDone);
  useEffect(() => {
    if (open) {
      setReason('');
      setFields([]);
      setError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return null;
  return (
    <Modal open={open} onClose={onClose} className="flex max-h-[calc(100dvh-24px)] flex-col overflow-hidden sm:max-h-[calc(100dvh-32px)]">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-4 sm:px-8 sm:pt-8">
        <Header tone="red" icon={<CircleX className="size-6" />} title="Reject User" subtitle="The user will see this reason in the app" />
        <p className="mt-[17px] text-base text-muted [overflow-wrap:anywhere] sm:text-lg">
          Reject the application from <b className="font-semibold text-ink">{displayName(user)}</b>? Please provide a reason.
        </p>
        <TextArea
          className="mt-5 h-[96px] rounded-card text-base sm:h-[120px] sm:text-lg"
          placeholder="Enter reason for rejecting..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus={typeof window !== 'undefined' && window.innerWidth >= 640}
        />
        <FieldPicker value={fields} onChange={setFields} />
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-line px-5 py-4 sm:flex-row sm:px-8 sm:py-5">
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            loading={busy}
            disabled={!reason.trim()}
            onClick={() => run(() => rejectUser(user.uid, reason, fields))}
          >
            Reject User
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} className="font-medium">
            Cancel
          </Button>
      </div>
    </Modal>
  );
}
