'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Check, CircleX, Trash2 } from 'lucide-react';
import { Button, Modal, ui } from '@/components/ui';
import { applicationStatusLabel, type JobApplication } from '@/lib/jobApplications';
import { corporateStatusLabel, type Corporate, type CorporateStatus } from '@/lib/corporates';
import { STATUS_LABEL, displayName } from '@/lib/format';
import { jobStatusLabel, type Job, type JobStatus } from '@/lib/jobs';
import type { AccountStatus, UserDoc } from '@/lib/types';

function DialogHeader({
  tone,
  icon,
  title,
  subtitle,
}: {
  tone: 'red' | 'green' | 'brand';
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  const toneClass =
    tone === 'red' ? 'bg-[#ffe2e2] text-danger' : tone === 'green' ? 'bg-[#dcfce7] text-success' : 'bg-brand/10 text-brand';
  return (
    <div className="flex items-start gap-[13px]">
      <span className={`grid size-[54px] shrink-0 place-items-center rounded-full ${toneClass}`}>{icon}</span>
      <div>
        <h2 className={ui.sectionTitle}>{title}</h2>
        <p className={ui.sectionLead}>{subtitle}</p>
      </div>
    </div>
  );
}

function useConfirmAction(onClose: () => void, onConfirm: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError((e as Error).message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}

export type ApplicationConfirmAction = 'approve' | 'reject' | 'delete';

const APPLICATION_ACTION: Record<
  ApplicationConfirmAction,
  {
    tone: 'red' | 'green';
    icon: ReactNode;
    title: string;
    subtitle: string;
    variant: 'success' | 'danger';
    confirmLabel: string;
    body: (name: string) => string;
  }
> = {
  approve: {
    tone: 'green',
    icon: <Check className="size-6" />,
    title: 'Approve application',
    subtitle: 'The applicant will be marked as approved',
    variant: 'success',
    confirmLabel: 'Approve',
    body: (name) => `Are you sure you want to approve the application from ${name}?`,
  },
  reject: {
    tone: 'red',
    icon: <CircleX className="size-6" />,
    title: 'Reject application',
    subtitle: 'The applicant will be marked as rejected',
    variant: 'danger',
    confirmLabel: 'Reject',
    body: (name) => `Are you sure you want to reject the application from ${name}?`,
  },
  delete: {
    tone: 'red',
    icon: <Trash2 className="size-6" />,
    title: 'Delete application',
    subtitle: 'This can’t be undone',
    variant: 'danger',
    confirmLabel: 'Delete application',
    body: (name) => `Are you sure you want to delete the application from ${name}?`,
  },
};

export function JobApplicationConfirmDialog({
  application,
  action,
  open,
  onClose,
  onConfirm,
}: {
  application: JobApplication | null;
  action: ApplicationConfirmAction | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { busy, error, run, setError } = useConfirmAction(onClose, onConfirm);
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  if (!application || !action) return null;
  const cfg = APPLICATION_ACTION[action];
  const name = application.name.trim() || application.email || application.uid;
  const statusNote =
    action !== 'delete' && application.status !== 'pending'
      ? ` Current status: ${applicationStatusLabel(application.status)}.`
      : '';

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-5 sm:p-8">
        <DialogHeader tone={cfg.tone} icon={cfg.icon} title={cfg.title} subtitle={cfg.subtitle} />
        <p className="mt-[17px] text-lg text-muted">
          {cfg.body(name)}
          {statusNote ? <span>{statusNote}</span> : null}
        </p>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <Button variant={cfg.variant} size="lg" className="flex-1" loading={busy} onClick={run}>
            {cfg.confirmLabel}
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} className="font-medium">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function JobStatusConfirmDialog({
  job,
  currentStatus,
  nextStatus,
  open,
  onClose,
  onConfirm,
}: {
  job: Job | null;
  /** Displayed status before the change; defaults to job.status. */
  currentStatus?: JobStatus;
  nextStatus: JobStatus | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { busy, error, run, setError } = useConfirmAction(onClose, onConfirm);
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const fromStatus = currentStatus ?? job?.status;
  if (!job || !nextStatus || !fromStatus || nextStatus === fromStatus) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-5 sm:p-8">
        <DialogHeader
          tone="brand"
          icon={<Check className="size-6" />}
          title="Update job status"
          subtitle="This changes whether the job is visible and how it appears in the list"
        />
        <p className="mt-[17px] text-lg text-muted">
          Are you sure you want to change <b className="font-semibold text-ink">{job.title}</b> ({job.jobId}) from{' '}
          <b className="font-semibold text-ink">{jobStatusLabel(fromStatus)}</b> to{' '}
          <b className="font-semibold text-ink">{jobStatusLabel(nextStatus)}</b>?
        </p>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <Button variant="primary" size="lg" className="flex-1" loading={busy} onClick={run}>
            Update status
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} className="font-medium">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CorporateStatusConfirmDialog({
  corporate,
  currentStatus,
  nextStatus,
  open,
  onClose,
  onConfirm,
}: {
  corporate: Corporate | null;
  currentStatus?: CorporateStatus;
  nextStatus: CorporateStatus | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { busy, error, run, setError } = useConfirmAction(onClose, onConfirm);
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const fromStatus = currentStatus ?? corporate?.status;
  if (!corporate || !nextStatus || !fromStatus || nextStatus === fromStatus) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-5 sm:p-8">
        <DialogHeader
          tone="brand"
          icon={<Check className="size-6" />}
          title="Update corporate status"
          subtitle="This changes how this partner appears and what they can do on the platform"
        />
        <p className="mt-[17px] text-lg text-muted">
          Are you sure you want to change <b className="font-semibold text-ink">{corporate.name}</b> from{' '}
          <b className="font-semibold text-ink">{corporateStatusLabel(fromStatus)}</b> to{' '}
          <b className="font-semibold text-ink">{corporateStatusLabel(nextStatus)}</b>?
        </p>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <Button variant="primary" size="lg" className="flex-1" loading={busy} onClick={run}>
            Update status
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} className="font-medium">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function UserStatusConfirmDialog({
  user,
  currentStatus,
  nextStatus,
  open,
  onClose,
  onConfirm,
}: {
  user: UserDoc | null;
  currentStatus?: AccountStatus;
  nextStatus: AccountStatus | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { busy, error, run, setError } = useConfirmAction(onClose, onConfirm);
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const fromStatus = currentStatus ?? user?.status;
  if (!user || !nextStatus || !fromStatus || nextStatus === fromStatus) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-5 sm:p-8">
        <DialogHeader
          tone="brand"
          icon={<Check className="size-6" />}
          title="Update user status"
          subtitle="This changes whether the user can access the app and how they appear in admin"
        />
        <p className="mt-[17px] text-lg text-muted">
          Are you sure you want to change <b className="font-semibold text-ink">{displayName(user)}</b> from{' '}
          <b className="font-semibold text-ink">{STATUS_LABEL[fromStatus]}</b> to{' '}
          <b className="font-semibold text-ink">{STATUS_LABEL[nextStatus]}</b>?
        </p>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <Button variant="primary" size="lg" className="flex-1" loading={busy} onClick={run}>
            Update status
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} className="font-medium">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}