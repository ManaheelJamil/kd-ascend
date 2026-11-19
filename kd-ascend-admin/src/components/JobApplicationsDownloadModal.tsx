'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Modal, ModalClose, cn, ui } from '@/components/ui';
import { applicationStatusLabel, type ApplicationStatus, type JobApplication } from '@/lib/jobApplications';
import { jobStatusLabel, type Job } from '@/lib/jobs';

const STATUSES: ApplicationStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];

function applicationsToCsv(rows: JobApplication[], job?: Job | null): string {
  const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const out: string[] = [];

  if (job) {
    const req = job.requirements.filter((r) => r.trim()).join('; ');
    const jobLines: [string, string][] = [
      ['Job ID', job.jobId],
      ['Title', job.title],
      ['Corporate', job.corporateName],
      ['Job status', jobStatusLabel(job.status)],
      ['Event date', job.eventDate],
      ['Event time', job.eventTime],
      ['Location', job.location],
      ['Salary', job.salary],
      ['Slots (male)', job.slotsMale],
      ['Slots (female)', job.slotsFemale],
      ['Posted on', job.postedOn ?? job.eventDate],
      ['Description', job.description],
      ['Requirements', req],
    ];
    out.push(...jobLines.map(([label, value]) => [label, value].map(esc).join(',')));
    out.push('');
  }

  const head = ['User ID', 'Name', 'Email', 'Contact', 'Status', 'Done Before'];
  out.push(head.map(esc).join(','));
  out.push(
    ...rows.map((a) =>
      [a.uid, a.name, a.email, a.phone, applicationStatusLabel(a.status), a.doneBefore].map(esc).join(','),
    ),
  );
  return out.join('\n');
}

export function downloadApplicationsCsv(rows: JobApplication[], job?: Job | null) {
  const blob = new Blob([applicationsToCsv(rows, job)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const slug = job?.jobId?.replace(/[^\w-]+/g, '-') || 'applications';
  a.download = `kd-ascend-${slug}-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function JobApplicationsDownloadModal({
  open,
  onClose,
  applications,
  job,
  onExported,
}: {
  open: boolean;
  onClose: () => void;
  applications: JobApplication[];
  job?: Job | null;
  onExported: (count: number, statusLabels: string[]) => void;
}) {
  const [picked, setPicked] = useState<Set<ApplicationStatus>>(new Set());

  useEffect(() => {
    if (open) setPicked(new Set());
  }, [open]);

  const toggle = (s: ApplicationStatus) =>
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  const run = () => {
    const labels = STATUSES.filter((s) => picked.has(s)).map(applicationStatusLabel);
    const rows = applications.filter((a) => picked.has(a.status));
    if (rows.length === 0) return;
    downloadApplicationsCsv(rows, job);
    onExported(rows.length, labels);
    onClose();
  };

  const matchCount = applications.filter((a) => picked.has(a.status)).length;

  return (
    <Modal open={open} onClose={onClose} className="max-w-[480px] overflow-hidden rounded-card border border-line shadow-brand/10">
      <ModalClose onClose={onClose} />
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="pr-8">
          <h2 className={ui.sectionTitle}>Download Applications</h2>
          <p className={cn('mt-1', ui.sectionLead)}>Select the application statuses to export.</p>
        </div>

        <ul className="flex flex-col gap-3">
          {STATUSES.map((s) => {
            const on = picked.has(s);
            const count = applications.filter((a) => a.status === s).length;
            return (
              <li key={s}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-control border px-4 py-3.5 transition',
                    on ? 'border-brand bg-brand/[0.04]' : 'border-field bg-white hover:bg-page',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(s)}
                    className="size-5 shrink-0 rounded border-[#d9d9d9] accent-brand"
                  />
                  <span className="flex-1 text-[15px] font-semibold text-ink">{applicationStatusLabel(s)}</span>
                  <span className="text-[13px] text-muted">{count}</span>
                </label>
              </li>
            );
          })}
        </ul>

        {picked.size > 0 && matchCount === 0 ? (
          <p className="text-[13.5px] text-muted">No applications match the selected statuses.</p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button variant="outline" size="lg" onClick={onClose} className="min-w-[100px] font-medium">
            Cancel
          </Button>
          <Button
            size="lg"
            className="min-w-[120px]"
            disabled={picked.size === 0 || matchCount === 0}
            onClick={run}
          >
            <Download className="size-4" />
            Download
          </Button>
        </div>
      </div>
    </Modal>
  );
}