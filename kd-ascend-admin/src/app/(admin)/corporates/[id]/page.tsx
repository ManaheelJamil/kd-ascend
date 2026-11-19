'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Mail, MapPin, Phone, SquarePen, Tag, Trash2, User } from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  ErrorNote,
  FullPageSpinner,
  InfoRow,
  PageShell,
  cn,
  ui,
} from '@/components/ui';
import { CorporateBlacklistUsers } from '@/components/CorporateBlacklistUsers';
import {
  CorporateStatusBadge,
  DeleteCorporateDialog,
  EditSectionModal,
  StatusPicker,
} from '@/components/CorporateBits';
import { subscribeCorporateBlacklist } from '@/lib/corporateBlacklist';
import { corporateStatusLabel, setCorporateStatus, subscribeCorporate, type Corporate, type CorporateStatus } from '@/lib/corporates';
import { CorporateStatusConfirmDialog } from '@/components/JobDialogs';
import { useToast } from '@/components/Toast';
import { longDay, shortDay, shortId } from '@/lib/format';

function SectionCard({ title, onEdit, children }: { title: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <Card pad="lg">
      <div className="flex items-center justify-between gap-4">
        <h2 className={ui.sectionTitle}>{title}</h2>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${title}`}
            className="grid size-10 place-items-center rounded-control bg-brand/10 text-brand transition hover:bg-brand/20"
          >
            <SquarePen className="size-[18px]" />
          </button>
        ) : null}
      </div>
      <div className="mt-[27px]">{children}</div>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[15.8px] text-white">{label}</span>
      <span className="text-[22.5px] font-bold text-white">{value}</span>
    </div>
  );
}

export default function CorporateDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [corporate, setCorporate] = useState<Corporate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<'company' | 'contact' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<CorporateStatus | null>(null);
  const [tab, setTab] = useState<'overview' | 'blacklist'>('overview');
  const [blacklistCount, setBlacklistCount] = useState(0);

  useEffect(() => {
    const unsub = subscribeCorporate(
      id,
      (c) => {
        setCorporate(c);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [id]);

  useEffect(() => {
    const unsub = subscribeCorporateBlacklist(
      id,
      (list) => setBlacklistCount(list.length),
      () => setBlacklistCount(0),
    );
    return () => unsub();
  }, [id]);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'blacklist') setTab('blacklist');
    else if (t === 'overview') setTab('overview');
  }, [id]);

  const goTab = (next: 'overview' | 'blacklist') => {
    setTab(next);
    const sp = new URLSearchParams(window.location.search);
    if (next === 'blacklist') sp.set('tab', 'blacklist');
    else sp.delete('tab');
    const qs = sp.toString();
    router.replace(`/corporates/${id}${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  if (loading) return <FullPageSpinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!corporate)
    return (
      <PageShell>
        <p className="py-20 text-center text-lg font-semibold">Corporate not found</p>
        <Link href="/corporates" className="mt-3 block text-center text-brand underline">
          Back to corporates
        </Link>
      </PageShell>
    );

  const requestStatusChange = (next: CorporateStatus) => {
    if (next === corporate.status) return;
    setStatusConfirm(next);
  };

  const applyStatusChange = async () => {
    if (!statusConfirm || statusConfirm === corporate.status) return;
    setStatusBusy(true);
    try {
      await setCorporateStatus(corporate.id, statusConfirm);
      toast.success(`Corporate status updated to ${corporateStatusLabel(statusConfirm)}.`);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      toast.error(msg || 'Could not update corporate status.');
      throw e;
    } finally {
      setStatusBusy(false);
    }
  };

  const letter = (corporate.name || '?').charAt(0).toUpperCase();

  return (
    <PageShell variant="detail">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-[18px]">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push('/corporates'))}
            aria-label="Back"
            className="mt-1 grid size-11 shrink-0 place-items-center rounded-full bg-white sm:size-[54px] text-ink transition hover:bg-line"
          >
            <ArrowLeft className="size-[22px]" />
          </button>
          <div>
            <h1 className={ui.pageHeading}>Corporate ID : {shortId(corporate.id)}</h1>
            <p className={ui.pageSubheading}>Joined on {longDay(corporate.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/corporates/${corporate.id}/edit`}>
            <Button variant="outline" size="lg" className="h-[51px] font-semibold">
              <SquarePen className="size-5" />
              Edit corporate
            </Button>
          </Link>
          <Button variant="danger" size="lg" className="h-[51px] font-semibold" onClick={() => setDeleting(true)}>
            <Trash2 className="size-5" />
            Delete corporate
          </Button>
        </div>
      </div>

      <div className="flex gap-8 border-b border-line">
        <button
          type="button"
          onClick={() => goTab('overview')}
          className={cn(
            '-mb-px border-b-2 pb-3 text-[15.8px] font-semibold transition',
            tab === 'overview' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => goTab('blacklist')}
          className={cn(
            '-mb-px border-b-2 pb-3 text-[15.8px] font-semibold transition',
            tab === 'blacklist' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          Blacklist Users{blacklistCount > 0 ? ` (${blacklistCount})` : ''}
        </button>
      </div>

      {tab === 'blacklist' ? (
        <CorporateBlacklistUsers corporateId={corporate.id} />
      ) : (
      <div className="grid gap-6 md:gap-[27px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6 md:gap-[27px]">
          <Card pad="lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-[17px]">
                <Avatar letter={letter} size={63} rounded="card" />
                <div className="min-w-0">
                  <h2 className={cn('truncate', ui.pageHeading)}>{corporate.name}</h2>
                  <CorporateStatusBadge status={corporate.status} className="mt-1" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing('company')}
                aria-label="Edit company information"
                className="grid size-10 shrink-0 place-items-center rounded-control bg-brand/10 text-brand transition hover:bg-brand/20"
              >
                <SquarePen className="size-[18px]" />
              </button>
            </div>
            <h3 className={cn('mt-9', ui.sectionTitle)}>Company Information</h3>
            <div className="mt-[27px] grid min-w-0 gap-6 md:grid-cols-2">
              <InfoRow icon={Building2} label="Name" value={corporate.name} />
              <InfoRow icon={Tag} label="Industry" value={corporate.industry} />
              <div className="min-w-0 md:col-span-2">
                <InfoRow icon={MapPin} label="Location" value={corporate.location} />
              </div>
            </div>
          </Card>

          <SectionCard title="Contact Person Details" onEdit={() => setEditing('contact')}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="min-w-0 md:col-span-2">
                <InfoRow icon={User} label="Contact Person Name" value={corporate.contactName} />
              </div>
              <InfoRow icon={Mail} label="Contact Email" value={corporate.contactEmail} />
              <InfoRow icon={Phone} label="Contact Phone" value={corporate.contactPhone} />
            </div>
          </SectionCard>

          <Card pad="lg">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 max-w-xl">
                <h2 className={ui.sectionTitleSm}>Job access restrictions</h2>
                <p className="mt-2 text-[15px] text-muted">
                  {blacklistCount === 0
                    ? 'No users are restricted from this corporate’s jobs.'
                    : `${blacklistCount} user${blacklistCount === 1 ? '' : 's'} cannot view or apply to jobs posted by this corporate.`}
                </p>
                <p className="mt-1 text-[13px] text-muted">Separate from the global app blacklist on Users.</p>
              </div>
              <Button variant="soft" className="shrink-0" onClick={() => goTab('blacklist')}>
                Manage blacklist
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6 md:gap-[27px]">
          <div className={cn('rounded-card bg-brand', ui.cardPadLg)}>
            <h2 className={cn(ui.sectionTitle, 'text-white')}>Summary</h2>
            <div className="mt-[27px] flex flex-col gap-[22px]">
              <SummaryRow label="Active Jobs" value={String(corporate.activeJobs ?? 0)} />
              <SummaryRow label="Completed Jobs" value={String(corporate.completedJobs ?? 0)} />
              <SummaryRow label="Total Jobs" value={String((corporate.activeJobs ?? 0) + (corporate.completedJobs ?? 0))} />
            </div>
            <div className="my-[26px] h-px bg-white/40" />
            <SummaryRow label="Restricted users" value={String(blacklistCount)} />
            <button
              type="button"
              onClick={() => goTab('blacklist')}
              className="mt-4 w-full rounded-control bg-white/15 px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-white/25"
            >
              Manage blacklist
            </button>
          </div>

          <Card pad="lg">
            <h2 className={ui.sectionTitle}>Recent Jobs</h2>
            <div className="mt-6 rounded-card bg-tile px-[18px] py-6 text-center text-[13.5px] text-muted">
              No jobs yet. Jobs will appear here once the Jobs module is live.
            </div>
          </Card>

          <Card pad="lg">
            <h2 className={ui.sectionTitle}>Account Information</h2>
            <dl className={cn('mt-6 flex flex-col gap-[14px]', ui.body)}>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Corporate ID</dt>
                <dd className="font-medium text-ink">#{shortId(corporate.id)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Joined</dt>
                <dd className="font-medium text-ink">{shortDay(corporate.createdAt)}</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <dt className="text-muted">Status</dt>
                <dd>
                  <StatusPicker value={corporate.status} onChange={requestStatusChange} busy={statusBusy} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Created by</dt>
                <dd className="font-medium text-ink">{corporate.createdBy || 'Admin'}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
      )}

      <EditSectionModal corporate={corporate} section={editing} onClose={() => setEditing(null)} />
      <DeleteCorporateDialog
        corporate={deleting ? corporate : null}
        onClose={() => setDeleting(false)}
        onDone={() => router.replace('/corporates')}
      />
      <CorporateStatusConfirmDialog
        corporate={corporate}
        nextStatus={statusConfirm}
        open={!!statusConfirm}
        onClose={() => setStatusConfirm(null)}
        onConfirm={applyStatusChange}
      />
    </PageShell>
  );
}