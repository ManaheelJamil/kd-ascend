'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { JobForm } from '@/components/JobForm';
import { FullPageSpinner, PageShell, ui } from '@/components/ui';
import { loadJob, type Job } from '@/lib/jobs';

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setJob(null);
      return;
    }
    // Read once: the form keeps what the admin types even if the job changes meanwhile.
    let alive = true;
    loadJob(id).then((j) => alive && setJob(j));
    return () => {
      alive = false;
    };
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