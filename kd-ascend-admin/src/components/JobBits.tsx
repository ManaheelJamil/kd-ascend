'use client';

import { useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { Button, Modal, cn, ui } from './ui';
import { JOB_STATUSES, deleteJob, jobStatusLabel, type Job, type JobStatus } from '@/lib/jobs';

const BADGE: Record<JobStatus, string> = {
  draft: 'bg-muted/10 text-muted',
  open: 'bg-success/10 text-success',
  filled: 'bg-brand/10 text-brand',
  closed: 'bg-muted/10 text-muted',
  cancelled: 'bg-danger/10 text-danger',
};

/** Change status from the jobs table or edit header (draft = unpublished, open = live). */
export function JobStatusPicker({
  value,
  onChange,
  busy,
  className,
}: {
  value: JobStatus;
  onChange: (s: JobStatus) => void;
  busy?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'relative inline-flex h-[34px] min-w-[7.25rem] shrink-0 items-center whitespace-nowrap rounded-full pr-8 pl-3.5 text-[13.5px] font-medium',
        BADGE[value] ?? BADGE.draft,
        busy && 'opacity-60',
        className,
      )}
    >
      <span>{jobStatusLabel(value)}</span>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5" />
      <select
        aria-label="Job status"
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value as JobStatus)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {JOB_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function JobStatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[27px] items-center rounded-full px-[11px] text-[13.5px] font-medium whitespace-nowrap',
        BADGE[status] ?? BADGE.draft,
        className,
      )}
    >
      {jobStatusLabel(status)}
    </span>
  );
}

export function DeleteJobDialog({ job, onClose, onDone }: { job: Job | null; onClose: () => void; onDone?: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!job) return null;
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteJob(job.id);
      toast.success(`${job.title} deleted.`);
      onDone?.();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose}>
      <div className="p-5 sm:p-8">
        <div className="flex items-start gap-[13px]">
          <span className="grid size-[54px] shrink-0 place-items-center rounded-full bg-[#ffe2e2] text-danger">
            <Trash2 className="size-6" />
          </span>
          <div>
            <h2 className={ui.sectionTitle}>Delete Job</h2>
            <p className={ui.sectionLead}>This can’t be undone</p>
          </div>
        </div>
        <p className="mt-[17px] text-lg text-muted">
          Are you sure you want to delete <b className="font-semibold text-ink">{job.title}</b> ({job.jobId})?
        </p>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <Button variant="danger" size="lg" className="flex-1" loading={busy} onClick={run}>
            Delete Job
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} className="font-medium">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}