'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { SquarePen, Trash2 } from 'lucide-react';
import { Button, ErrorNote, FullPageSpinner, cn } from '@/components/ui';
import { DeleteCorporateDialog } from '@/components/CorporateBits';
import { BlacklistTab, CorporateTabs, OverviewTab, type CorporateTab } from '@/components/CorporateDetail';
import {
  assignCorporateNumbers,
  corporateCode,
  subscribeCorporate,
  subscribeCorporates,
  type Corporate,
  type CorporateStatus,
} from '@/lib/corporates';

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
  const [deleted, setDeleted] = useState(false);

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

  // While deleting, the record vanishes before the delete finishes: keep a spinner, not "not found".
  if (loading || deleted || (deleting && !corporate)) return <FullPageSpinner />;
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

  const facts: { label: string; value: string; sub?: string }[] = [
    { label: 'Contact Person', value: corporate.contactName || '—', sub: corporate.industry || undefined },
    { label: 'Email', value: corporate.contactEmail || '—' },
    { label: 'Phone', value: corporate.contactPhone || '—' },
    { label: 'Location', value: corporate.location || '—' },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-5">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[12.5px] text-muted">
          <Link href="/corporates" className="hover:text-brand">
            Corporates
          </Link>
          <span>/</span>
          <span className="truncate">{corporate.name}</span>
        </nav>

        <div className="-mt-2">
          <h1 className="text-[24px] leading-8 font-bold break-words text-ink sm:text-[28px] sm:leading-9">{corporate.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
            <span>Corporate ID: {corporateCode(corporate)}</span>
            <CorporateStatusPill status={corporate.status} />
          </div>
        </div>

        <div className="flex items-start gap-4 sm:gap-6">
          <span className="grid size-[60px] shrink-0 place-items-center rounded-full border border-line bg-white px-1 text-center text-[9px] leading-tight font-bold text-ink uppercase sm:size-[68px]">
            {corporate.name.length > 18 ? corporate.name.split(/\s+/).slice(0, 2).join(' ') : corporate.name}
          </span>
          <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4 lg:gap-x-8">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-[11.5px] text-muted">{f.label}</dt>
                <dd
                  className={cn(
                    'mt-0.5 text-[13.5px] text-ink [overflow-wrap:anywhere]',
                    f.label === 'Contact Person' && 'font-semibold',
                  )}
                >
                  {f.value}
                </dd>
                {f.sub ? <dd className="text-[11px] text-muted">{f.sub}</dd> : null}
              </div>
            ))}
          </dl>
          <Link
            href={`/corporates/${corporate.id}/edit`}
            aria-label="Edit corporate"
            className="grid size-9 shrink-0 place-items-center rounded-control bg-brand/10 text-brand hover:bg-brand/15"
          >
            <SquarePen className="size-4" />
          </Link>
        </div>

        <CorporateTabs tab={tab} onChange={setTab} />
      </div>

      {tab === 'overview' ? <OverviewTab corporate={corporate} /> : <BlacklistTab corporate={corporate} />}

      <div className="pt-2">
        <Button variant="ghost" className="text-[14px] text-danger hover:bg-danger/5" onClick={() => setDeleting(true)}>
          <Trash2 className="size-[18px]" />
          Delete corporate
        </Button>
      </div>

      <DeleteCorporateDialog
        corporate={deleting ? corporate : null}
        onClose={() => setDeleting(false)}
        onDone={() => {
          setDeleted(true);
          router.replace('/corporates');
        }}
      />
    </div>
  );
}

const PILL: Record<CorporateStatus, string> = {
  active: 'bg-success/15 text-success',
  pending: 'bg-brand/15 text-brand',
  inactive: 'bg-muted/15 text-muted',
};

/** Figma: small green "Active" pill next to the Corporate ID. */
function CorporateStatusPill({ status }: { status: CorporateStatus }) {
  return (
    <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold', PILL[status] ?? PILL.pending)}>
      {status === 'active' ? 'Active' : status === 'inactive' ? 'Inactive' : 'Pending'}
    </span>
  );
}
