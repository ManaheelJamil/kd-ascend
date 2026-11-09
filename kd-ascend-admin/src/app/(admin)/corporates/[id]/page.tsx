'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Building2, ChevronRight, SquarePen, Trash2 } from 'lucide-react';
import { Button, Card, ErrorNote, FullPageSpinner, ShortText } from '@/components/ui';
import { DeleteCorporateDialog, StatusPicker } from '@/components/CorporateBits';
import { BlacklistTab, CorporateTabs, OverviewTab, type CorporateTab } from '@/components/CorporateDetail';
import {
  assignCorporateNumbers,
  corporateCode,
  setCorporateStatus,
  subscribeCorporate,
  subscribeCorporates,
  type Corporate,
  type CorporateStatus,
} from '@/lib/corporates';
import { isoDay } from '@/lib/format';

/** Figma "Corporates Detail": header, then the Overview / Blacklist Users tabs (?tab=blacklist). */
export default function CorporateDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const tab: CorporateTab = params.get('tab') === 'blacklist' ? 'blacklist' : 'overview';
  const setTab = (t: CorporateTab) => router.replace(t === 'overview' ? `/corporates/${id}` : `/corporates/${id}?tab=blacklist`, { scroll: false });
  const [corporate, setCorporate] = useState<Corporate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(
    () =>
      subscribeCorporate(
        id,
        (c) => {
          setCorporate(c);
          setLoading(false);
        },
        (e) => {
          setError(e.message);
          setLoading(false);
        },
      ),
    [id],
  );

  // Corporate ID (CRP-01 …) for a corporate added before numbering existed.
  const needsNumber = !!corporate && !corporate.corporateNo;
  useEffect(() => {
    if (!needsNumber) return;
    let done = false;
    const unsub = subscribeCorporates(
      (list) => {
        if (done) return;
        done = true;
        assignCorporateNumbers(list).catch(() => undefined);
      },
      () => undefined,
    );
    return unsub;
  }, [needsNumber]);

  if (loading) return <FullPageSpinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!corporate)
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">Corporate not found</p>
        <Link href="/corporates" className="mt-3 inline-block text-brand underline">
          Back to corporates
        </Link>
      </div>
    );

  const changeStatus = async (s: CorporateStatus) => {
    if (s === corporate.status) return;
    setStatusBusy(true);
    try {
      await setCorporateStatus(corporate.id, s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStatusBusy(false);
    }
  };

  const blacklisted = Object.keys(corporate.blacklist ?? {}).length;
  const facts: { label: string; value: string; sub?: string }[] = [
    { label: 'Contact Person', value: corporate.contactName || '—', sub: corporate.industry || undefined },
    { label: 'Email', value: corporate.contactEmail || '—' },
    { label: 'Phone', value: corporate.contactPhone || '—' },
    { label: 'Location', value: corporate.location || '—' },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
        <Link href="/corporates" className="hover:text-brand">
          Corporates
        </Link>
        <ChevronRight className="size-3.5 shrink-0" />
        <span className="truncate text-ink">{corporate.name}</span>
      </nav>

      <Card className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] leading-7 font-bold break-words text-ink sm:text-[27px] sm:leading-8">{corporate.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13.5px] text-muted">
              <span>Corporate ID: {corporateCode(corporate)}</span>
              <StatusPicker value={corporate.status} onChange={changeStatus} busy={statusBusy} />
              <span className="hidden sm:inline">· Joined on {isoDay(corporate.createdAt)}</span>
            </div>
          </div>
          <Link
            href={`/corporates/${corporate.id}/edit`}
            aria-label="Edit corporate"
            className="grid size-10 shrink-0 place-items-center rounded-control bg-brand/10 text-brand hover:bg-brand/15"
          >
            <SquarePen className="size-[18px]" />
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <span className="grid size-16 shrink-0 place-items-center rounded-full border border-line bg-page text-navy">
            <Building2 className="size-7" />
          </span>
          <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-[12.5px] text-muted">{f.label}</dt>
                <dd className="mt-0.5 text-[14.5px] font-semibold text-ink">
                  {f.label === 'Email' ? <span className="block break-all">{f.value}</span> : <ShortText text={f.value} />}
                </dd>
                {f.sub ? <dd className="text-[12px] text-muted">{f.sub}</dd> : null}
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-6">
          <CorporateTabs tab={tab} onChange={setTab} blacklisted={blacklisted} />
        </div>
      </Card>

      {tab === 'overview' ? <OverviewTab corporate={corporate} /> : <BlacklistTab corporate={corporate} />}

      <div>
        <Button variant="ghost" className="text-danger hover:bg-danger/5" onClick={() => setDeleting(true)}>
          <Trash2 className="size-[18px]" />
          Delete corporate
        </Button>
      </div>

      <DeleteCorporateDialog
        corporate={deleting ? corporate : null}
        onClose={() => setDeleting(false)}
        onDone={() => router.replace('/corporates')}
      />
    </div>
  );
}
