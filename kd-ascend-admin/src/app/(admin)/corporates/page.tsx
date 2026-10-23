'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronDown, Download, Filter, Search, SquarePen, Trash2 } from 'lucide-react';
import { Avatar, Button, Card, ErrorNote, FullPageSpinner, IconButton, PageTitle, cn } from '@/components/ui';
import { CorporateStatusBadge, DeleteCorporateDialog } from '@/components/CorporateBits';
import { CORPORATE_STATUSES, corporateStatusLabel, subscribeCorporates, type Corporate, type CorporateStatus } from '@/lib/corporates';
import { isoDay } from '@/lib/format';

type SortKey = 'name' | 'contact' | 'status' | 'added';

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
          ? (c.contactPhone || '').toLowerCase()
          : sort.key === 'status'
            ? c.status
            : (c.createdAt?.toMillis?.() ?? Date.now());
    return filtered.sort((a, b) => (val(a) < val(b) ? -sort.dir : val(a) > val(b) ? sort.dir : 0));
  }, [list, q, status, sort]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

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
    <th className={cn('px-[18px] text-[13.5px] font-semibold text-muted', className)}>
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

  if (loading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-[27px]">
      <PageTitle title="Corporates Management">
        <Link href="/corporates/new">
          <Button className="h-[45px] rounded-card px-5">
            <Building2 className="size-[18px]" />
            Add Corporate
          </Button>
        </Link>
      </PageTitle>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Card className="flex flex-wrap items-center gap-[14px] p-4 sm:p-[28px]">
        <div className="relative w-full min-w-0 flex-1 sm:w-auto sm:min-w-[220px]">
          <Search className="pointer-events-none absolute top-1/2 left-[18px] size-5 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search corporate"
            className="h-[46px] w-full rounded-card border border-field pr-4 pl-[50px] text-base outline-none sm:h-[52px] sm:text-lg placeholder:text-[#0a0a0a]/50 focus:border-brand"
          />
        </div>
        <div className="relative" ref={filterRef}>
          <Button variant="outline" className="h-[46px] rounded-card px-4 text-base sm:h-[52px] sm:px-5 sm:text-lg" onClick={() => setFilterOpen((o) => !o)}>
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
        <Button variant="outline" className="h-[46px] rounded-card px-4 text-base sm:h-[52px] sm:px-5 sm:text-lg" onClick={exportCsv}>
          <Download className="size-5" />
          Export{selected.size ? ` (${selected.size})` : ''}
        </Button>
      </Card>

      <Card className="overflow-hidden md:min-h-[400px]">
        {/* Phones: one card per corporate instead of the wide table. */}
        <ul className="divide-y divide-line md:hidden">
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
                    <CorporateStatusBadge status={c.status} />
                  </div>
                  {c.contactEmail ? <p className="truncate text-[13px] text-muted">{c.contactEmail}</p> : null}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[12.5px] text-muted">
                      {c.contactPhone || '—'} · {isoDay(c.createdAt)}
                    </p>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/corporates/${c.id}/edit`}
                        aria-label="Edit"
                        className="grid size-[31px] place-items-center rounded-control text-muted hover:bg-page hover:text-ink"
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

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
            <thead>
              <tr className="h-16 border-b border-line bg-page">
                <th className="relative w-[32%] px-[18px] pl-[51px] text-[13.5px] font-semibold text-muted">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allChecked}
                    onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))}
                    className="absolute top-1/2 left-[19px] size-5 -translate-y-1/2"
                  />
                  <button
                    type="button"
                    onClick={() => setSort((s) => ({ key: 'name', dir: s.key === 'name' ? (s.dir === 1 ? -1 : 1) : 1 }))}
                    className="inline-flex items-center gap-0.5 hover:text-ink"
                  >
                    Corporate
                    <ChevronDown className={cn('size-5', sort.key === 'name' && sort.dir === -1 && 'rotate-180')} strokeWidth={1.8} />
                  </button>
                </th>
                <th className="w-[11%] px-[18px] text-[13.5px] font-semibold text-muted">Profile</th>
                <SortHead k="contact" label="Contact" className="w-[15%]" />
                <SortHead k="status" label="Status" className="w-[14%]" />
                <SortHead k="added" label="Added Date" className="w-[14%]" />
                <th className="w-[14%] px-[18px] pr-[18px] text-right text-[13.5px] font-semibold text-muted">Actions</th>
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
                    className="h-[69px] cursor-pointer border-b border-line last:border-b-0 hover:bg-page/70"
                  >
                    <td className="relative px-[18px] pl-[51px]">
                      <input
                        type="checkbox"
                        aria-label={`Select ${c.name}`}
                        checked={selected.has(c.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() =>
                          setSelected((s) => {
                            const n = new Set(s);
                            if (n.has(c.id)) n.delete(c.id);
                            else n.add(c.id);
                            return n;
                          })
                        }
                        className="absolute top-1/2 left-[19px] size-5 -translate-y-1/2"
                      />
                      <p className="truncate text-[15.8px] font-medium text-ink">{c.name}</p>
                      {c.contactEmail ? <p className="truncate text-[13.5px] text-muted">{c.contactEmail}</p> : null}
                    </td>
                    <td className="px-[18px]">
                      <Avatar letter={(c.name || '?').charAt(0).toUpperCase()} />
                    </td>
                    <td className="truncate px-[18px] text-[13.5px] text-muted">{c.contactPhone || '—'}</td>
                    <td className="px-[18px]">
                      <CorporateStatusBadge status={c.status} />
                    </td>
                    <td className="px-[18px] text-[13.5px] text-muted">{isoDay(c.createdAt)}</td>
                    <td className="px-[18px]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/corporates/${c.id}/edit`}
                          aria-label="Edit"
                          title="Edit"
                          className="grid size-[31px] place-items-center rounded-control text-muted transition hover:bg-page hover:text-ink"
                        >
                          <SquarePen className="size-[18px]" />
                        </Link>
                        <IconButton label="Delete" onClick={() => setToDelete(c)} className="text-danger">
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
      </Card>

      <DeleteCorporateDialog corporate={toDelete} onClose={() => setToDelete(null)} />
    </div>
  );
}
