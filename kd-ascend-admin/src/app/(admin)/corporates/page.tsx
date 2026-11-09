'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronDown, Download, Filter, Search, SquarePen, Trash2 } from 'lucide-react';
import { Avatar, Button, Card, ErrorNote, FullPageSpinner, IconButton, PageTitle, cn } from '@/components/ui';
import { DeleteCorporateDialog } from '@/components/CorporateBits';
import {
  CORPORATE_STATUSES,
  assignCorporateNumbers,
  corporateStatusLabel,
  subscribeCorporates,
  type Corporate,
  type CorporateStatus,
} from '@/lib/corporates';
import { isoDay } from '@/lib/format';

type SortKey = 'name' | 'contact' | 'email' | 'jobs' | 'status' | 'added';

export default function CorporatesPage() {
  const router = useRouter();
  const [list, setList] = useState<Corporate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | CorporateStatus>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'added', dir: -1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<Corporate | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      subscribeCorporates(
        (l) => {
          setList(l);
          setError(null);
          setLoading(false);
        },
        (e) => {
          setError(
            (e as { code?: string }).code === 'permission-denied'
              ? 'Permission denied while reading corporates. Publish the latest Firestore rules.'
              : e.message,
          );
          setLoading(false);
        },
      ),
    [],
  );

  // Corporate IDs (CRP-01 …) for corporates added before numbering existed.
  const numbering = useRef(false);
  useEffect(() => {
    if (loading || numbering.current || !list.some((c) => !c.corporateNo)) return;
    numbering.current = true;
    assignCorporateNumbers(list)
      .catch(() => undefined)
      .finally(() => {
        numbering.current = false;
      });
  }, [list, loading]);

  useEffect(() => {
    if (!filterOpen) return;
    const close = (e: MouseEvent) => !filterRef.current?.contains(e.target as Node) && setFilterOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [filterOpen]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = list.filter(
      (c) =>
        (status === 'all' || c.status === status) &&
        (!needle ||
          [c.name, c.industry, c.location, c.contactName, c.contactEmail, c.contactPhone]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(needle)),
    );
    const val = (c: Corporate): string | number =>
      sort.key === 'name'
        ? c.name.toLowerCase()
        : sort.key === 'contact'
          ? (c.contactName || '').toLowerCase()
          : sort.key === 'email'
            ? (c.contactEmail || '').toLowerCase()
            : sort.key === 'jobs'
              ? jobsPosted(c)
              : sort.key === 'status'
            ? c.status
            : (c.createdAt?.toMillis?.() ?? Date.now());
    return filtered.sort((a, b) => (val(a) < val(b) ? -sort.dir : val(a) > val(b) ? sort.dir : 0));
  }, [list, q, status, sort]);


  const exportCsv = () => {
    const pick = selected.size ? rows.filter((r) => selected.has(r.id)) : rows;
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Corporate', 'Industry', 'Location', 'Status', 'Contact Person', 'Contact Email', 'Contact Phone', 'Added'];
    const lines = pick.map((c) =>
      [c.name, c.industry, c.location, corporateStatusLabel(c.status), c.contactName, c.contactEmail, c.contactPhone, isoDay(c.createdAt)]
        .map(esc)
        .join(','),
    );
    const url = URL.createObjectURL(new Blob([[head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `kd-ascend-corporates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th className={cn('px-[18px] text-[13px] font-semibold text-ink', className)}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}
        className="inline-flex items-center gap-0.5 hover:text-ink"
      >
        {label}
        {sort.key === k ? <ChevronDown className={cn('size-4 transition', sort.dir === -1 && 'rotate-180')} strokeWidth={1.8} /> : null}
      </button>
    </th>
  );

  if (loading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-[27px]">
      <PageTitle title="Corporates Management" subtitle="Manage corporate accounts and their job activity.">
        <Link href="/corporates/new">
          <Button className="h-[45px] rounded-card px-5">
            <Building2 className="size-[18px]" />
            Add Corporate
          </Button>
        </Link>
      </PageTitle>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Card className="flex flex-wrap items-center gap-[14px] p-4 sm:p-[28px]">
        <div className="relative min-w-0 basis-full sm:min-w-[220px] sm:flex-1 sm:basis-auto">
          <Search className="pointer-events-none absolute top-1/2 left-[18px] size-5 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search corporate"
            className="h-[46px] w-full rounded-card border border-field pr-4 pl-[50px] text-base outline-none sm:h-[52px] sm:text-lg placeholder:text-[#0a0a0a]/50 focus:border-brand"
          />
        </div>
        <div className="relative flex-1 sm:flex-none" ref={filterRef}>
          <Button variant="outline" className="h-[46px] rounded-card px-4 text-base sm:h-[52px] sm:px-5 sm:text-lg w-full sm:w-auto" onClick={() => setFilterOpen((o) => !o)}>
            <Filter className="size-5" />
            {status === 'all' ? 'Filter' : corporateStatusLabel(status)}
          </Button>
          {filterOpen ? (
            <div className="absolute left-0 z-20 mt-2 w-48 rounded-control sm:right-0 sm:left-auto border border-line bg-white py-1.5 shadow-lg">
              {[{ value: 'all' as const, label: 'All corporates' }, ...CORPORATE_STATUSES].map((s) => (
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
        <Button variant="outline" className="h-[46px] rounded-card px-4 text-base sm:h-[52px] sm:px-5 sm:text-lg flex-1 sm:flex-none" onClick={exportCsv}>
          <Download className="size-5" />
          Export{selected.size ? ` (${selected.size})` : ''}
        </Button>
      </Card>

      <Card className="overflow-hidden xl:min-h-[360px] xl:border-0 xl:bg-transparent">
        {/* Phones: one card per corporate instead of the wide table. */}
        <ul className="divide-y divide-line xl:hidden">
          {rows.length === 0 ? (
            <li className="px-4 py-12 text-center text-[15px] text-muted">
              {list.length === 0 ? 'No corporates yet.' : 'No corporates match your search.'}
            </li>
          ) : (
            rows.map((c) => (
              <li
                key={c.id}
                onClick={() => router.push(`/corporates/${c.id}`)}
                className="flex cursor-pointer items-start gap-3 px-4 py-3.5 active:bg-page"
              >
                <Avatar letter={(c.name || '?').charAt(0).toUpperCase()} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[15px] font-semibold text-ink">{c.name}</p>
                    <StatusDot status={c.status} />
                  </div>
                  {c.contactEmail ? <p className="truncate text-[13px] text-muted">{c.contactEmail}</p> : null}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[12.5px] text-muted">
                      {c.contactName || '—'} · {jobsPosted(c)} jobs posted
                    </p>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/corporates/${c.id}/edit`}
                        aria-label="Edit"
                        className="grid size-9 place-items-center rounded-control text-muted hover:bg-page hover:text-ink sm:size-[31px]"
                      >
                        <SquarePen className="size-[18px]" />
                      </Link>
                      <IconButton label="Delete" onClick={() => setToDelete(c)} className="text-danger">
                        <Trash2 className="size-[18px]" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>

        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-left">
            <thead>
              <tr className="h-14">
                <th className="w-[24%] px-[18px] text-[13px] font-semibold text-ink">
                  <button
                    type="button"
                    onClick={() => setSort((s) => ({ key: 'name', dir: s.key === 'name' ? (s.dir === 1 ? -1 : 1) : 1 }))}
                    className="inline-flex items-center gap-0.5 hover:text-ink"
                  >
                    Corporate Name
                    {sort.key === 'name' ? <ChevronDown className={cn('size-4', sort.dir === -1 && 'rotate-180')} strokeWidth={1.8} /> : null}
                  </button>
                </th>
                <SortHead k="contact" label="Contact Person" className="w-[17%]" />
                <SortHead k="email" label="Email" className="w-[23%]" />
                <SortHead k="jobs" label="Jobs Posted" className="w-[12%]" />
                <SortHead k="status" label="Status" className="w-[11%]" />
                <th className="w-[13%] px-[18px] text-center text-[13px] font-semibold text-ink">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[15px] text-muted">
                    {list.length === 0 ? (
                      <>
                        No corporates yet.{' '}
                        <Link href="/corporates/new" className="font-semibold text-brand underline">
                          Add the first one
                        </Link>
                      </>
                    ) : (
                      'No corporates match your search.'
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/corporates/${c.id}`)}
                    className="h-[60px] cursor-pointer rounded-control hover:bg-white"
                  >
                    <td className="px-[18px]">
                      <p className="truncate text-[14px] font-bold text-ink">{c.name}</p>
                    </td>
                    <td className="truncate px-[18px] text-[13.5px] text-ink/80">{c.contactName || '—'}</td>
                    <td className="truncate px-[18px] text-[13.5px] text-ink/80" title={c.contactEmail}>
                      {c.contactEmail || '—'}
                    </td>
                    <td className="px-[18px] text-[13.5px] text-ink/80">{jobsPosted(c)}</td>
                    <td className="px-[18px]">
                      <StatusDot status={c.status} />
                    </td>
                    <td className="px-[18px] text-center" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/corporates/${c.id}`}
                        className="inline-flex h-7 items-center rounded-md bg-brand/10 px-3 text-[12px] font-semibold text-brand hover:bg-brand/15"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {rows.length ? (
        <p className="text-[12px] text-muted">
          Showing 1–{rows.length} of {rows.length} corporate{rows.length === 1 ? '' : 's'}
        </p>
      ) : null}

      <DeleteCorporateDialog corporate={toDelete} onClose={() => setToDelete(null)} />
    </div>
  );
}

/** Jobs posted so far (active + completed). Filled in by the Jobs module. */
const jobsPosted = (c: Corporate) => (c.activeJobs ?? 0) + (c.completedJobs ?? 0);

const DOT: Record<CorporateStatus, string> = {
  active: 'bg-success text-success',
  pending: 'bg-brand text-brand',
  inactive: 'bg-muted text-muted',
};

/** Figma "● Active": coloured dot + label. */
function StatusDot({ status }: { status: CorporateStatus }) {
  const [dot, text] = (DOT[status] ?? DOT.pending).split(' ');
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13.5px] font-medium whitespace-nowrap', text)}>
      <span className={cn('size-2 rounded-full', dot)} />
      {corporateStatusLabel(status)}
    </span>
  );
}
