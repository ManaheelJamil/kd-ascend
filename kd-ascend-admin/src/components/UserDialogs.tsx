'use client';

import { useEffect, useState } from 'react';
import { Ban, CircleCheck, CircleX } from 'lucide-react';
import { Button, Modal, TextArea } from './ui';
import { blacklistUser, rejectUser, removeFromBlacklist } from '@/lib/users';
import { displayName } from '@/lib/format';
import type { UserDoc } from '@/lib/types';

type DialogProps = { user: UserDoc | null; open: boolean; onClose: () => void; onDone?: () => void };

function Header({ tone, icon, title, subtitle }: { tone: 'red' | 'green'; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-[13px]">
      <span className={`grid size-[54px] shrink-0 place-items-center rounded-full ${tone === 'red' ? 'bg-[#ffe2e2] text-danger' : 'bg-[#dcfce7] text-success'}`}>
        {icon}
      </span>
      <div>
        <h2 className="text-[22.5px] leading-8 font-bold text-ink">{title}</h2>
        <p className="text-[13.5px] text-muted">{subtitle}</p>
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
  const { busy, error, run, setError } = useAction(onClose, onDone);
  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-8">
        <Header tone="red" icon={<Ban className="size-6" />} title="Blacklist User" subtitle="This action can be reversed later" />
        <p className="mt-[17px] text-lg text-muted">
          Are you sure you want to blacklist <b className="font-semibold text-ink">{displayName(user)}</b>? Please provide a reason.
        </p>
        <TextArea
          className="mt-5 h-[120px] rounded-card text-lg"
          placeholder="Enter reason for blacklisting..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            loading={busy}
            disabled={!reason.trim()}
            onClick={() => run(() => blacklistUser(user.uid, reason))}
          >
            Blacklist User
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} className="font-medium">
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
      <div className="p-8">
        {showReason ? (
          <>
            <Header tone="red" icon={<Ban className="size-6" />} title="Blacklist User" subtitle="This action can be reversed later" />
            <p className="mt-[17px] text-lg text-muted">
              <b className="font-semibold text-ink">{displayName(user)}</b> is Blacklisted. Provided reason:
            </p>
            <TextArea className="mt-5 h-[120px] rounded-card text-lg" value={user.blacklistReason || 'No reason given.'} readOnly />
          </>
        ) : (
          <>
            <Header tone="green" icon={<CircleCheck className="size-6" />} title="Remove from Blacklist" subtitle="Restore user access" />
            <p className="mt-[17px] text-lg text-muted">
              Are you sure you want to remove <b className="font-semibold text-ink">{displayName(user)}</b> from the blacklist? They will be
              able to access the platform again.
            </p>
          </>
        )}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-3">
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
  const { busy, error, run, setError } = useAction(onClose, onDone);
  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return null;
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-8">
        <Header tone="red" icon={<CircleX className="size-6" />} title="Reject User" subtitle="The user will see this reason in the app" />
        <p className="mt-[17px] text-lg text-muted">
          Reject the application from <b className="font-semibold text-ink">{displayName(user)}</b>? Please provide a reason.
        </p>
        <TextArea
          className="mt-5 h-[120px] rounded-card text-lg"
          placeholder="Enter reason for rejecting..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            loading={busy}
            disabled={!reason.trim()}
            onClick={() => run(() => rejectUser(user.uid, reason))}
          >
            Reject User
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} className="font-medium">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
