'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, cn, ui } from '@/components/ui';
import { applicationStatusLabel, subscribeAllApplications, type JobApplication } from '@/lib/jobApplications';
import { subscribeJobs, type Job } from '@/lib/jobs';
import { formatMoney, subscribePaymentTransactions, type PaymentTransaction } from '@/lib/payments';
import { shortDayFromIso } from '@/lib/format';

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[15.8px] text-white">{label}</span>
      <span className="text-[22.5px] font-bold text-white">{value}</span>
    </div>
  );
}

const STATUS_TONE: Record<JobApplication['status'], string> = {
  pending: 'bg-brand/10 text-brand',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
  cancelled: 'bg-muted/10 text-muted',
};

/**
 * User detail page, right column: job and earnings summary plus recent jobs,
 * live from jobs/{id}/applications and paymentTransactions.
 */
export default function UserJobSummary({ uid, email }: { uid: string; email?: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [byJob, setByJob] = useState<Map<string, JobApplication[]>>(new Map());
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);

  useEffect(() => {
    const offs = [
      subscribeJobs(setJobs, () => undefined),
      subscribeAllApplications(setByJob, () => undefined),
      subscribePaymentTransactions(setPayments, () => undefined),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  const emailNorm = (email ?? '').trim().toLowerCase();
  const isMe = (userUid: string, mail: string) =>
    (!!uid && userUid === uid) || (!!emailNorm && mail.trim().toLowerCase() === emailNorm);

  const mine = useMemo(() => {
    const rows: { job: Job; app: JobApplication }[] = [];
    for (const job of jobs) {
      const app = (byJob.get(job.id) ?? []).find((a) => isMe(a.userUid, a.email));
      if (app) rows.push({ job, app });
    }
    // Most recent shift first.
    return rows.sort((a, b) => (b.job.eventDate || '').localeCompare(a.job.eventDate || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, byJob, uid, emailNorm]);

  const myPayments = payments.filter((t) => isMe(t.userUid, t.userEmail));
  const earnings = myPayments
    .filter((t) => t.type === 'payout' && t.status === 'completed')
    .reduce((n, t) => n + t.amount, 0);
  const penalties = myPayments
    .filter((t) => t.type === 'penalty' && t.status !== 'failed')
    .reduce((n, t) => n + t.amount, 0);
  const completed = mine.filter(({ job, app }) => job.status === 'closed' && app.status === 'approved').length;
  const cancelled = mine.filter(({ app }) => app.status === 'cancelled').length;

  return (
    <>
      <div className={cn('rounded-card bg-brand', ui.cardPadLg)}>
        <h2 className={cn(ui.sectionTitle, 'text-white')}>Summary</h2>
        <div className="mt-[27px] flex flex-col gap-[22px]">
          <SummaryRow label="Total Jobs" value={String(mine.length)} />
          <SummaryRow label="Completed" value={String(completed)} />
          <SummaryRow label="Canceled" value={String(cancelled)} />
        </div>
        <div className="my-[26px] h-px bg-white/40" />
        <div className="flex flex-col gap-[22px]">
          <SummaryRow label="Total Earnings" value={formatMoney(earnings)} />
          <SummaryRow label="Total Penalties" value={formatMoney(penalties)} />
          <SummaryRow label="Net Earnings" value={formatMoney(earnings - penalties)} />
        </div>
      </div>

      <Card pad="lg">
        <h2 className={ui.sectionTitle}>Recent Jobs</h2>
        {mine.length === 0 ? (
          <div className="mt-6 rounded-card bg-tile px-[18px] py-6 text-center text-[13.5px] text-muted">
            No jobs yet.
          </div>
        ) : (
          <ul className="mt-5 flex flex-col divide-y divide-line">
            {mine.slice(0, 5).map(({ job, app }) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-semibold text-ink">{job.title}</span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {job.jobId} · {job.corporateName} · {shortDayFromIso(job.eventDate)}
                    </span>
                  </span>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold', STATUS_TONE[app.status])}>
                    {applicationStatusLabel(app.status)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
