'use client';

import { cn } from '@/components/ui';
import { shortDayFromIso } from '@/lib/format';
import type { Job } from '@/lib/jobs';

export function PaymentJobSummary({ job, jobIdFallback }: { job: Job | null; jobIdFallback?: string }) {
  if (job) {
    return (
      <div className="rounded-card border border-line bg-page/80 p-4 sm:p-5">
        <p className="text-[15.8px] font-semibold text-ink">{job.title}</p>
        <p className="mt-1 text-[13.5px] text-muted">
          {job.jobId} · {job.corporateName}
        </p>
        <dl className="mt-4 grid gap-2 text-[13.5px] sm:grid-cols-2">
          <div>
            <dt className="text-muted">Event</dt>
            <dd className="font-medium text-ink">
              {shortDayFromIso(job.eventDate)}
              {job.eventTime ? ` · ${job.eventTime}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Rate</dt>
            <dd className="font-medium text-ink">{job.salary || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">Location</dt>
            <dd className="font-medium text-ink">{job.location || '—'}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (!jobIdFallback) return null;

  return (
    <div className="rounded-card border border-line bg-page/80 p-4 sm:p-5">
      <p className="text-[15.8px] font-semibold text-ink">Job {jobIdFallback}</p>
      <p className="mt-1 text-[13.5px] text-muted">Full job details are not available for this record.</p>
    </div>
  );
}

export function PaymentJobSummaryEmpty({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'rounded-card border border-dashed border-field bg-page/50 px-4 py-6 text-center text-[14px] text-muted',
        className,
      )}
    >
      Select a user and job to see job details and calculate pay.
    </p>
  );
}