'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Download, Plus, Trash2, UserRound, X } from 'lucide-react';
import {
  JobApplicationsDownloadModal,
  downloadApplicationsCsv,
} from '@/components/JobApplicationsDownloadModal';
import { PickerEmpty } from '@/components/CorporateBlacklistUsers';
import { JobAddApplicantModal, type JobApplicantExisting } from '@/components/JobAddApplicantModal';
import {
  JobApplicationConfirmDialog,
  type ApplicationConfirmAction,
} from '@/components/JobDialogs';
import type { Job } from '@/lib/jobs';
import { useToast } from '@/components/Toast';
import { Button, Card, IconButton, cn, ui } from '@/components/ui';
import {
  applicationStatusLabel,
  getJobApplications,
  subscribeJobApplications,
  removeJobApplication,
  setApplicationStatus,
  type ApplicationStatus,
  type JobApplication,
} from '@/lib/jobApplications';

const BADGE: Record<ApplicationStatus, string> = {
  pending: 'bg-brand/10 text-brand',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
  cancelled: 'bg-navy/10 text-navy',
};

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-[27px] items-center rounded-full px-[11px] text-[13.5px] font-medium whitespace-nowrap',
        BADGE[status],
      )}
    >
      {applicationStatusLabel(status)}
    </span>
  );
}

type SortKey = 'uid' | 'name' | 'email' | 'phone' | 'status' | 'doneBefore';

export function JobApplicationsTable({
  jobId,
  job,
  showTitle = true,
  onCountsChange,
}: {
  jobId: string;
  job?: Job;
  showTitle?: boolean;
  onCountsChange?: () => void;
}) {
  const toast = useToast();
  const [source, setSource] = useState<JobApplication[]>(() => getJobApplications(jobId));

  // Live from Firestore: changes from this page, other admins and the mobile app show up instantly.
  useEffect(() => {
    return subscribeJobApplications(
      jobId,
      (list) => {
        setSource(list);
        onCountsChange?.();
      },
      (e) => toast.error(e.message || 'Could not load applications.'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'uid', dir: 1 });
  const [addOpen, setAddOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ application: JobApplication; action: ApplicationConfirmAction } | null>(
    null,
  );

  const existingOnJob = useMemo<JobApplicantExisting>(
    () => ({
      uids: new Set(source.map((a) => a.userUid).filter(Boolean)),
      emails: new Set(source.map((a) => a.email.trim().toLowerCase()).filter(Boolean)),
      memberCodes: new Set(source.map((a) => a.uid.trim().toLowerCase()).filter(Boolean)),
    }),
    [source],
  );

  // The live listener updates the list; nothing to reload by hand.
  const refresh = () => undefined;

  const rows = useMemo(() => {
    const val = (a: JobApplication): string | number =>
      sort.key === 'uid'
        ? a.uid.toLowerCase()
        : sort.key === 'name'
          ? a.name.toLowerCase()
          : sort.key === 'email'
            ? a.email.toLowerCase()
            : sort.key === 'phone'
              ? a.phone
              : sort.key === 'status'
                ? a.status
                : Number.parseInt(a.doneBefore, 10) || 0;
    return [...source].sort((a, b) => (val(a) < val(b) ? -sort.dir : val(a) > val(b) ? sort.dir : 0));
  }, [source, sort]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const SortHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th className={cn('px-[18px]', ui.tableHead, className)}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}
        className="inline-flex items-center gap-0.5 whitespace-nowrap hover:text-ink"
      >
        {label}
        <ChevronDown className={cn('size-5 shrink-0 transition', sort.key === k && sort.dir === -1 && 'rotate-180')} strokeWidth={1.8} />
      </button>
    </th>
  );

  const finishConfirm = async () => {
    if (!confirm) return;
    const { application, action } = confirm;
    setBusy(application.id);
    try {
      if (action === 'delete') {
        await removeJobApplication(jobId, application.id);
        setSelected((s) => {
          const n = new Set(s);
          n.delete(application.id);
          return n;
        });
        toast.success('Application removed.');
        return;
      }
      const status: ApplicationStatus = action === 'approve' ? 'approved' : 'rejected';
      await setApplicationStatus(jobId, application.id, status);
      toast.success(`Application ${applicationStatusLabel(status).toLowerCase()} successfully.`);
    } catch (e) {
      toast.error((e as Error).message || 'Could not save the change.');
    } finally {
      setBusy(null);
    }
  };

  const onDownloadClick = () => {
    if (source.length === 0) {
      toast.error('No applications to export.');
      return;
    }
    if (selected.size > 0) {
      const rows = source.filter((a) => selected.has(a.id));
      downloadApplicationsCsv(rows, job);
      toast.success(`Downloaded CSV with ${rows.length} selected application${rows.length === 1 ? '' : 's'}.`);
      return;
    }
    setDownloadOpen(true);
  };

  const actions = (a: JobApplication) => (
    <div className="flex justify-end gap-1">
      <IconButton
        label="Approve"
        disabled={busy === a.id}
        onClick={() => setConfirm({ application: a, action: 'approve' })}
        className="text-muted hover:bg-page hover:text-success"
      >
        <Check className="size-[18px]" />
      </IconButton>
      <IconButton
        label="Reject"
        disabled={busy === a.id}
        onClick={() => setConfirm({ application: a, action: 'reject' })}
        className="text-muted hover:bg-page hover:text-danger"
      >
        <X className="size-[18px]" />
      </IconButton>
      <IconButton
        label="Delete"
        disabled={busy === a.id}
        onClick={() => setConfirm({ application: a, action: 'delete' })}
        className="text-muted hover:bg-page hover:text-danger"
      >
        <Trash2 className="size-[18px]" />
      </IconButton>
    </div>
  );

  return (
  <>
    <Card className={cn('overflow-hidden', rows.length === 0 ? 'md:min-h-[280px]' : undefined)}>
      <div className={cn('flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-[22.5px]', !showTitle && !job && 'hidden')}>
        {showTitle ? <h2 className={ui.sectionTitle}>Applications ({source.length})</h2> : <span />}
        {job ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="h-[42px] text-[14.5px]" onClick={onDownloadClick}>
              <Download className="size-4" />
              Download{selected.size > 0 ? ` (${selected.size})` : ''}
            </Button>
            <Button className="h-[42px] text-[14.5px]" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add applicant
            </Button>
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="p-5 sm:p-[22.5px] sm:pt-6">
          <div className="overflow-hidden rounded-card border border-line">
            <PickerEmpty
              icon={<UserRound className="size-5" />}
              title="No applications yet"
              detail={job ? 'Use Add applicant to assign a user to this job.' : undefined}
            />
          </div>
        </div>
      ) : (
      <>
      <ul className="divide-y divide-line md:hidden">
          {rows.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-4 py-3.5">
              <input
                type="checkbox"
                aria-label={`Select ${a.name}`}
                checked={selected.has(a.id)}
                onChange={() =>
                  setSelected((s) => {
                    const n = new Set(s);
                    if (n.has(a.id)) n.delete(a.id);
                    else n.add(a.id);
                    return n;
                  })
                }
                className="mt-3 size-5 shrink-0 rounded border-[#d9d9d9]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[15px] font-semibold text-ink">{a.name}</p>
                  <ApplicationStatusBadge status={a.status} />
                </div>
                <p className="truncate text-[13px] text-muted">
                  {a.uid} · {a.email}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="truncate text-[12.5px] text-muted">
                    {a.phone} · Done before: {a.doneBefore}
                  </p>
                  {actions(a)}
                </div>
              </div>
            </li>
          ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1100px] table-fixed border-collapse text-left">
          <thead>
            <tr className="h-16 border-b border-line bg-page">
              <th className="relative min-w-[128px] w-[13%] px-[18px] pl-[51px] text-[13.5px] font-semibold text-muted">
                <input
                  type="checkbox"
                  aria-label="Select all applications"
                  checked={allChecked}
                  onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))}
                  className="absolute top-1/2 left-[19px] size-5 -translate-y-1/2 rounded border-[#d9d9d9]"
                />
                <button
                  type="button"
                  onClick={() => setSort((s) => ({ key: 'uid', dir: s.key === 'uid' ? (s.dir === 1 ? -1 : 1) : 1 }))}
                  className="inline-flex items-center gap-0.5 whitespace-nowrap hover:text-ink"
                >
                  User ID
                  <ChevronDown className={cn('size-5 shrink-0', sort.key === 'uid' && sort.dir === -1 && 'rotate-180')} strokeWidth={1.8} />
                </button>
              </th>
              <SortHead k="name" label="Name" className="w-[15%]" />
              <SortHead k="email" label="Email" className="w-[17%]" />
              <SortHead k="phone" label="Contact" className="w-[14%]" />
              <SortHead k="status" label="Status" className="w-[12%]" />
              <SortHead k="doneBefore" label="Done Before" className="min-w-[118px] w-[13%]" />
              <th className="w-[16%] whitespace-nowrap px-[18px] pr-[18px] text-right text-[13.5px] font-semibold text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="h-[69px] border-b border-line last:border-b-0 hover:bg-page/70">
                  <td className="relative px-[18px] pl-[51px]">
                    <input
                      type="checkbox"
                      aria-label={`Select ${a.uid}`}
                      checked={selected.has(a.id)}
                      onChange={() =>
                        setSelected((s) => {
                          const n = new Set(s);
                          if (n.has(a.id)) n.delete(a.id);
                          else n.add(a.id);
                          return n;
                        })
                      }
                      className="absolute top-1/2 left-[19px] size-5 -translate-y-1/2 rounded border-[#d9d9d9]"
                    />
                    <span className="block truncate text-[15px] font-medium text-ink">{a.uid}</span>
                  </td>
                  <td className="truncate px-[18px] text-[15px] font-medium text-ink" title={a.name}>
                    {a.name}
                  </td>
                  <td className="truncate px-1.5 text-[13.5px] text-muted" title={a.email}>
                    {a.email}
                  </td>
                  <td className="truncate px-1.5 text-[13.5px] text-muted">{a.phone}</td>
                  <td className="px-[18px]">
                    <ApplicationStatusBadge status={a.status} />
                  </td>
                  <td className="px-[18px] text-[13.5px] text-muted">{a.doneBefore}</td>
                  <td className="px-[18px]">{actions(a)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      </>
      )}
    </Card>
    {job ? (
      <JobAddApplicantModal
        open={addOpen}
        job={job}
        existingOnJob={existingOnJob}
        onClose={() => setAddOpen(false)}
        onAdded={refresh}
      />
    ) : null}
    <JobApplicationConfirmDialog
      application={confirm?.application ?? null}
      action={confirm?.action ?? null}
      open={!!confirm}
      onClose={() => setConfirm(null)}
      onConfirm={finishConfirm}
    />
    <JobApplicationsDownloadModal
      open={downloadOpen}
      onClose={() => setDownloadOpen(false)}
      applications={source}
      job={job}
      onExported={(count, labels) => {
        const statusPart = labels.length ? ` (${labels.join(', ')})` : '';
        toast.success(`Downloaded CSV with ${count} application${count === 1 ? '' : 's'}${statusPart}.`);
      }}
    />
  </>
  );
}