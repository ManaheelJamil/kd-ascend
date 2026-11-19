'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness, Check, ChevronDown, Download, Filter, Search, SquarePen, Trash2 } from 'lucide-react';
import { Button, Card, IconButton, PageShell, PageTitle, Spinner, ToolbarSearch, cn, ui } from '@/components/ui';
import { DeleteJobDialog, JobStatusPicker } from '@/components/JobBits';
import { JobStatusConfirmDialog } from '@/components/JobDialogs';
import { useToast } from '@/components/Toast';
import {
  JOB_STATUSES,
  jobClosePayoutToast,
  jobStatusLabel,
  subscribeJobs,
  updateJobStatus,
  type Job,
  type JobStatus,
} from '@/lib/jobs';

type SortKey = 'jobId' | 'title' | 'corporate' | 'eventDate' | 'salary' | 'status';

export default function JobsPage() {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | JobStatus>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'eventDate', dir: -1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<Job | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ job: Job; next: JobStatus } | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const requestStatusChange = (job: Job, next: JobStatus) => {
    if (next === job.status) return;
    setStatusConfirm({ job, next });
  };

  const applyStatusChange = async () => {
    if (!statusConfirm) return;
    const { job, next } = statusConfirm;
    setStatusBusy(job.id);
    try {
      const { createdPayouts } = await updateJobStatus(job.id, next);
      setList((l) => l.map((j) => (j.id === job.id ? { ...j, status: next } : j)));
      const base = `Job status updated to ${jobStatusLabel(next)}.`;
      toast.success(next === 'closed' ? jobClosePayoutToast(base, createdPayouts) : base);
      setStatusConfirm(null);
    } catch (e) {
      toast.error((e as Error).message || 'Could not update job status.');
    } finally {
      setStatusBusy(null);
    }
  };

  useEffect(() => {
    const unsub = subscribeJobs((l) => {
      setList(l);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const close = (e: MouseEvent) => !filterRef.current?.contains(e.target as Node) && setFilterOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [filterOpen]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = list.filter(
      (j) =>
        (status === 'all' || j.status === status) &&
        (!needle ||
          [j.jobId, j.title, j.corporateName, j.salary, j.eventDate]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(needle)),
    );
    const val = (j: Job): string | number =>
      sort.key === 'jobId'
        ? j.jobId.toLowerCase()
        : sort.key === 'title'
          ? j.title.toLowerCase()
          : sort.key === 'corporate'
            ? j.corporateName.toLowerCase()
            : sort.key === 'eventDate'
              ? j.eventDate
              : sort.key === 'salary'
                ? j.salary.toLowerCase()
                : j.status;
    return filtered.sort((a, b) => (val(a) < val(b) ? -sort.dir : val(a) > val(b) ? sort.dir : 0));
  }, [list, q, status, sort]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const exportCsv = () => {
    const pick = selected.size ? rows.filter((r) => selected.has(r.id)) : rows;
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const head = ['ID', 'Title', 'Corporate', 'Event Date', 'Salary', 'Status'];
    const lines = pick.map((j) =>
      [j.jobId, j.title, j.corporateName, j.eventDate, j.salary, jobStatusLabel(j.status)].map(esc).join(','),
    );
    const url = URL.createObjectURL(new Blob([[head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `kd-ascend-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th className={cn('px-[18px]', ui.tableHead, className)}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}
        className="inline-flex items-center gap-0.5 hover:text-ink"
      >
        {label}
        <ChevronDown className={cn('size-5 transition', sort.key === k && sort.dir === -1 && 'rotate-180')} strokeWidth={1.8} />
      </button>
    </th>
  );

  return (
    <PageShell>
      <PageTitle title="Jobs Management" subtitle="View and manage event staffing jobs">
        <Link href="/jobs/new">
          <Button>
            <BriefcaseBusiness className="size-[18px]" />
            Add Job
          </Button>
        </Link>
      </PageTitle>

      <Card pad="lg" className="flex flex-wrap items-center gap-[14px]">
        <ToolbarSearch value={q} onChange={setQ} placeholder="Search jobs" icon={Search} />
        <div className="relative" ref={filterRef}>
          <Button variant="outline" className={ui.toolbarControl} onClick={() => setFilterOpen((o) => !o)}>
            <Filter className="size-5" />
            {status === 'all' ? 'Filter' : jobStatusLabel(status)}
          </Button>
          {filterOpen ? (
            <div className="absolute left-0 z-20 mt-2 w-48 rounded-control sm:right-0 sm:left-auto border border-line bg-white py-1.5 shadow-lg">
              {[{ value: 'all' as const, label: 'All jobs' }, ...JOB_STATUSES].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setStatus(s.value);
                    setFilterOpen(false);
                    setSelected(new Set());
                  }}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-[14.5px] text-ink hover:bg-page"
                >
                  {s.label}
                  {status === s.value ? <Check className="size-4 text-brand" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Button variant="outline" className={cn(ui.toolbarControl, 'px-5')} onClick={exportCsv}>
          <Download className="size-5" />
          Export{selected.size ? ` (${selected.size})` : ''}
        </Button>
      </Card>

      <Card className="overflow-hidden md:min-h-[400px]">
        {loading ? (
          <div className="grid min-h-[280px] place-items-center py-16">
            <Spinner className="size-8" />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line md:hidden">
              {rows.length === 0 ? (
                <li className="px-4 py-12 text-center text-[15px] text-muted">
                  {list.length === 0 ? 'No jobs yet.' : 'No jobs match your search.'}
                </li>
              ) : (
                rows.map((j) => (
                  <li
                    key={j.id}
                    onClick={() => router.push(`/jobs/${j.id}`)}
                    className="flex cursor-pointer items-start gap-3 px-4 py-3.5 active:bg-page"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[15px] font-semibold text-ink">{j.title}</p>
                        <span onClick={(e) => e.stopPropagation()}>
                          <JobStatusPicker value={j.status} busy={statusBusy === j.id} onChange={(s) => requestStatusChange(j, s)} />
                        </span>
                      </div>
                      <p className="text-[13px] text-muted">
                        {j.jobId} · {j.corporateName}
                      </p>
                      <p className="mt-1 text-[12.5px] text-muted">
                        {j.eventDate} · {j.salary}
                      </p>
                      <div className="mt-2 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/jobs/${j.id}/edit`}
                          aria-label="Edit"
                          className="grid size-[31px] place-items-center rounded-control text-muted hover:bg-page hover:text-ink"
                        >
                          <SquarePen className="size-[18px]" />
                        </Link>
                        <IconButton label="Delete" onClick={() => setToDelete(j)} className="text-danger">
                          <Trash2 className="size-[18px]" />
                        </IconButton>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1180px] table-fixed border-collapse text-left">
                <thead>
                  <tr className="h-16 border-b border-line bg-page">
                    <th className="relative w-[16%] min-w-[148px] px-[18px] pl-[51px] text-[13.5px] font-semibold text-muted">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={allChecked}
                        onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))}
                        className="absolute top-1/2 left-[19px] size-5 -translate-y-1/2"
                      />
                      <button
                        type="button"
                        onClick={() => setSort((s) => ({ key: 'jobId', dir: s.key === 'jobId' ? (s.dir === 1 ? -1 : 1) : 1 }))}
                        className="inline-flex items-center gap-0.5 hover:text-ink"
                      >
                        ID
                        <ChevronDown className={cn('size-5', sort.key === 'jobId' && sort.dir === -1 && 'rotate-180')} strokeWidth={1.8} />
                      </button>
                    </th>
                    <SortHead k="title" label="Title" className="w-[19%]" />
                    <SortHead k="corporate" label="Corporate" className="w-[16%]" />
                    <SortHead k="eventDate" label="Event Date" className="min-w-[118px] w-[12%]" />
                    <SortHead k="salary" label="Salary" className="w-[13%]" />
                    <SortHead k="status" label="Status" className="min-w-[124px] w-[14%]" />
                    <th className="w-[11%] min-w-[96px] px-[18px] pr-[18px] text-right text-[13.5px] font-semibold text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-[15px] text-muted">
                        {list.length === 0 ? (
                          <>
                            No jobs yet.{' '}
                            <Link href="/jobs/new" className="font-semibold text-brand underline">
                              Add the first one
                            </Link>
                          </>
                        ) : (
                          'No jobs match your search.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    rows.map((j) => (
                      <tr
                        key={j.id}
                        onClick={() => router.push(`/jobs/${j.id}`)}
                        className="h-[69px] cursor-pointer border-b border-line last:border-b-0 hover:bg-page/70"
                      >
                        <td className="relative min-w-[148px] px-[18px] pl-[51px]">
                          <input
                            type="checkbox"
                            aria-label={`Select ${j.jobId}`}
                            checked={selected.has(j.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() =>
                              setSelected((s) => {
                                const n = new Set(s);
                                if (n.has(j.id)) n.delete(j.id);
                                else n.add(j.id);
                                return n;
                              })
                            }
                            className="absolute top-1/2 left-[19px] size-5 -translate-y-1/2"
                          />
                          <span className="block whitespace-nowrap text-[15px] font-medium text-ink" title={j.jobId}>
                            {j.jobId}
                          </span>
                        </td>
                        <td className="truncate px-[18px] text-[15px] font-medium text-ink" title={j.title}>
                          {j.title}
                        </td>
                        <td className="truncate px-[18px] text-[13.5px] text-muted" title={j.corporateName}>
                          {j.corporateName}
                        </td>
                        <td className="whitespace-nowrap px-[18px] text-[13.5px] text-muted">{j.eventDate}</td>
                        <td className="truncate px-[18px] text-[13.5px] text-muted">{j.salary}</td>
                        <td className="px-[18px]" onClick={(e) => e.stopPropagation()}>
                          <JobStatusPicker value={j.status} busy={statusBusy === j.id} onChange={(s) => requestStatusChange(j, s)} />
                        </td>
                        <td className="px-[18px]" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/jobs/${j.id}/edit`}
                              aria-label="Edit"
                              title="Edit"
                              className="grid size-[31px] place-items-center rounded-control text-muted transition hover:bg-page hover:text-ink"
                            >
                              <SquarePen className="size-[18px]" />
                            </Link>
                            <IconButton label="Delete" onClick={() => setToDelete(j)} className="text-danger">
                              <Trash2 className="size-[18px]" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <DeleteJobDialog
        job={toDelete}
        onClose={() => setToDelete(null)}
        onDone={() => {
          if (toDelete) {
            setList((l) => l.filter((j) => j.id !== toDelete.id));
            setSelected((s) => {
              const n = new Set(s);
              n.delete(toDelete.id);
              return n;
            });
          }
        }}
      />
      <JobStatusConfirmDialog
        job={statusConfirm?.job ?? null}
        nextStatus={statusConfirm?.next ?? null}
        open={!!statusConfirm}
        onClose={() => setStatusConfirm(null)}
        onConfirm={applyStatusChange}
      />
    </PageShell>
  );
}