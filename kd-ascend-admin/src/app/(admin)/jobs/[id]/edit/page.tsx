'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { JobForm } from '@/components/JobForm';
import { FullPageSpinner, PageShell, ui } from '@/components/ui';
import { getJob, type Job } from '@/lib/jobs';

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setJob(null);
      return;
    }
    const t = window.setTimeout(() => setJob(getJob(id)), 0);
    return () => window.clearTimeout(t);
  }, [id]);

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

  return <JobForm mode="edit" job={job} />;
}