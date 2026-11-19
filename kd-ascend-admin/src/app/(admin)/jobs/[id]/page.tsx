'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Check, Clock, DollarSign, MapPin, SquarePen } from 'lucide-react';
import { JobApplicationsTable } from '@/components/JobApplicationsTable';
import { JobStatusBadge, JobStatusPicker } from '@/components/JobBits';
import { JobStatusConfirmDialog } from '@/components/JobDialogs';
import { useToast } from '@/components/Toast';
import { Card, FullPageSpinner, PageShell, cn, ui } from '@/components/ui';
import { applicationStats } from '@/lib/jobApplications';
import { longDayFromIso, shortDayFromIso } from '@/lib/format';
import {
  getJob,
  jobClosePayoutToast,
  jobStatusLabel,
  updateJobStatus,
  type Job,
  type JobStatus,
} from '@/lib/jobs';

type JobTab = 'overview' | 'applications';

function JobFact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-card bg-page p-4 sm:p-5">
      <Icon className="size-5 text-brand" strokeWidth={1.8} />
      <p className="mt-3 text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-1 text-[15px] leading-snug font-semibold text-ink">{value}</p>
    </div>
  );
}

function slotSummary(job: Job): string {
  const male = Number.parseInt(job.slotsMale, 10) || 0;
  const female = Number.parseInt(job.slotsFemale, 10) || 0;
  const parts: string[] = [];
  if (male > 0) parts.push(`Male • ${male} slot${male === 1 ? '' : 's'}`);
  if (female > 0) parts.push(`Female • ${female} slot${female === 1 ? '' : 's'}`);
  return parts.join(' · ') || 'No slots configured';
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<JobStatus | null>(null);
  const [tab, setTab] = useState<JobTab>('overview');
  const [appCounts, setAppCounts] = useState({ total: 0, pending: 0 });

  const refreshCounts = useCallback(() => {
    if (id) setAppCounts(applicationStats(id));
  }, [id]);

  useEffect(() => {
    if (!id) {
      setJob(null);
      return;
    }
    const found = getJob(id);
    setJob(found);
    if (found) setAppCounts(applicationStats(found.id));
  }, [id]);

  useEffect(() => {
    if (!job) return;
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'applications') setTab('applications');
    else if (t === 'overview') setTab('overview');
    else if (job.status === 'open' && applicationStats(job.id).pending > 0) setTab('applications');
  }, [job]);

  const goTab = (next: JobTab) => {
    setTab(next);
    const sp = new URLSearchParams(window.location.search);
    if (next === 'applications') sp.set('tab', 'applications');
    else sp.delete('tab');
    const qs = sp.toString();
    router.replace(`/jobs/${id}${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const requestStatusChange = (next: JobStatus) => {
    if (!job || next === job.status) return;
    setStatusConfirm(next);
  };

  const applyStatusChange = async () => {
    if (!job || !statusConfirm || statusConfirm === job.status) return;
    setStatusBusy(true);
    try {
      const { createdPayouts } = await updateJobStatus(job.id, statusConfirm);
      setJob({ ...job, status: statusConfirm });
      const base = `Job status updated to ${jobStatusLabel(statusConfirm)}.`;
      toast.success(
        statusConfirm === 'closed' ? jobClosePayoutToast(base, createdPayouts) : base,
      );
      setStatusConfirm(null);
    } catch (e) {
      toast.error((e as Error).message || 'Could not update job status.');
    } finally {
      setStatusBusy(false);
    }
  };

  if (job === undefined) return <FullPageSpinner />;
  if (!job) {
    return (
      <PageShell>
        <h1 className={ui.pageHeading}>Job not found</h1>
        <Link href="/jobs" className="mt-4 text-brand underline">
          Back to jobs
        </Link>
      </PageShell>
    );
  }

  const pageTitle = `${job.corporateName} – ${job.title} (${job.jobId})`;
  const posted = longDayFromIso(job.postedOn ?? job.eventDate);
  const applicationsTabLabel =
    appCounts.pending > 0
      ? `Applications (${appCounts.total} · ${appCounts.pending} pending)`
      : `Applications (${appCounts.total})`;

  const overviewCard = (
    <Card pad="lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <JobStatusPicker value={job.status} onChange={requestStatusChange} busy={statusBusy} />
        <span className="rounded-full bg-page px-3.5 py-1.5 text-[13.5px] font-medium text-muted">{slotSummary(job)}</span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <JobFact icon={Calendar} label="Event Date" value={shortDayFromIso(job.eventDate)} />
        <JobFact icon={Clock} label="Event Time" value={job.eventTime || '—'} />
        <JobFact icon={DollarSign} label="Rate" value={job.salary || '—'} />
        <JobFact icon={MapPin} label="Location" value={job.location || '—'} />
      </div>

      <h2 className={cn('mt-9', ui.sectionTitle)}>About the Job</h2>
      <p className="mt-4 text-[15.8px] leading-relaxed text-muted">{job.description || '—'}</p>

      {job.requirements.length > 0 ? (
        <>
          <h2 className={cn('mt-9', ui.sectionTitle)}>Requirements</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {job.requirements.map((req) => (
              <li key={req} className="flex items-start gap-3 text-[15px] text-ink">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
                {req}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  );

  return (
    <PageShell variant="detail">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-[18px]">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push('/jobs'))}
            aria-label="Back"
            className="mt-1 grid size-11 shrink-0 place-items-center rounded-full bg-white sm:size-[54px] text-ink transition hover:bg-line"
          >
            <ArrowLeft className="size-[22px]" />
          </button>
          <div className="min-w-0">
            <h1 className={cn(ui.pageHeading, 'max-w-3xl')}>{pageTitle}</h1>
            <p className={ui.pageSubheading}>Posted on {posted}</p>
          </div>
        </div>
        <Link
          href={`/jobs/${job.id}/edit`}
          aria-label="Edit job"
          className="grid size-10 place-items-center rounded-control bg-brand/10 text-brand transition hover:bg-brand/20"
        >
          <SquarePen className="size-[18px]" />
        </Link>
      </div>

      <div className="flex gap-8 border-b border-line">
        <button
          type="button"
          onClick={() => goTab('overview')}
          className={cn(
            '-mb-px border-b-2 pb-3 text-[15.8px] font-semibold transition',
            tab === 'overview' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => goTab('applications')}
          className={cn(
            '-mb-px border-b-2 pb-3 text-[15.8px] font-semibold transition',
            tab === 'applications' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {applicationsTabLabel}
        </button>
      </div>

      {tab === 'overview' ? (
        overviewCard
      ) : (
        <div className="flex flex-col gap-[27px]">
          <Card pad="lg" className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">{job.title}</p>
              <p className="mt-0.5 text-[13.5px] text-muted">
                {shortDayFromIso(job.eventDate)} · {job.eventTime}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <JobStatusBadge status={job.status} />
              <span className="text-[13.5px] font-medium text-muted">{slotSummary(job)}</span>
            </div>
          </Card>
          <JobApplicationsTable jobId={job.id} job={job} showTitle={false} onCountsChange={refreshCounts} />
        </div>
      )}
      <JobStatusConfirmDialog
        job={job}
        nextStatus={statusConfirm}
        open={!!statusConfirm}
        onClose={() => setStatusConfirm(null)}
        onConfirm={applyStatusChange}
      />
    </PageShell>
  );
}