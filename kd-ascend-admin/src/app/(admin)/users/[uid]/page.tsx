'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building,
  Calendar,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  CreditCard,
  FileText,
  Flag,
  IdCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  SquarePen,
  User,
} from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  ErrorNote,
  FullPageSpinner,
  InfoRow,
  PageShell,
  StatusBadge,
  cn,
  ui,
} from '@/components/ui';
import { BlacklistDialog, RejectDialog, RemoveBlacklistDialog } from '@/components/UserDialogs';
import DocumentReviewModal from '@/components/DocumentReviewModal';
import UserJobSummary from '@/components/UserJobSummary';
import { EditContactModal, EditPersonalModal } from '@/components/EditUserModals';
import { approveUser, listDocuments, subscribeUser, type UserDocument } from '@/lib/users';
import { displayName, dob, initial, longDay, shortDay, shortId } from '@/lib/format';
import type { UserDoc } from '@/lib/types';
import { resubmitLabels } from '@/lib/resubmit';

function Plain({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 max-w-full">
      <p className={ui.fieldLabel}>{label}</p>
      <p className={cn('mt-1.5 whitespace-normal wrap-anywhere', ui.body)}>{value || '—'}</p>
    </div>
  );
}

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

function DocStatus({ status }: { status?: 'verified' | 'rejected' }) {
  if (status === 'verified')
    return (
      <span className="inline-flex items-center gap-1.5 text-[15.8px] font-semibold text-success">
        <CircleCheck className="size-[18px]" /> Verified
      </span>
    );
  if (status === 'rejected')
    return (
      <span className="inline-flex items-center gap-1.5 text-[15.8px] font-semibold text-danger">
        <CircleX className="size-[18px]" /> Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[15.8px] font-semibold text-brand">
      <Clock className="size-[18px]" /> Not reviewed
    </span>
  );
}

export default function UserDetailsPage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'blacklist' | 'unblacklist' | 'reject' | 'contact' | 'personal' | null>(null);
  const [doc, setDoc] = useState<{ item: UserDocument; mode: 'view' | 'review' } | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(
    () =>
      subscribeUser(
        uid,
        (u) => {
          setUser(u);
          setLoading(false);
        },
        (e) => {
          setError(e.message);
          setLoading(false);
        },
      ),
    [uid],
  );

  const documents = useMemo(() => (user ? listDocuments(user) : []), [user]);

  // Keep the open document in sync with live changes (e.g. after approving it).
  const openDoc = doc ? documents.find((d) => JSON.stringify(d.ref) === JSON.stringify(doc.item.ref)) ?? doc.item : null;

  if (loading) return <FullPageSpinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!user)
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">User not found</p>
        <Link href="/users" className="mt-3 inline-block text-brand underline">
          Back to users
        </Link>
      </div>
    );

  const approve = async () => {
    setApproving(true);
    try {
      await approveUser(user.uid);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApproving(false);
    }
  };

  const p = user.profile;
  const payout = user.payout;
  const canDecide = user.status === 'under_review' || user.status === 'incomplete' || user.status === 'rejected';

  return (
    <PageShell variant="detail">
      {/* Title row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-[18px]">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push('/users'))}
            aria-label="Back"
            className="mt-1 grid size-11 shrink-0 place-items-center rounded-full bg-white sm:size-[54px] text-ink transition hover:bg-line"
          >
            <ArrowLeft className="size-[22px]" />
          </button>
          <div>
            <h1 className={ui.pageHeading}>User ID : {shortId(user.uid)}</h1>
            <p className={ui.pageSubheading}>Joined on {longDay(user.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/users/${user.uid}/edit`}>
            <Button variant="outline" size="lg" className="h-[51px] font-semibold">
              <SquarePen className="size-5" />
              Edit user
            </Button>
          </Link>
          {user.status === 'blacklisted' ? (
            <Button variant="success" className="h-[51px] px-6 font-semibold" onClick={() => setDialog('unblacklist')}>
              <ShieldCheck className="size-5" />
              Remove from Blacklist
            </Button>
          ) : user.status === 'approved' || (user.status === 'under_review' && user.resubmittedFrom === 'blacklisted') ? (
            <Button variant="danger" size="lg" onClick={() => setDialog('blacklist')}>
              Blacklist User
            </Button>
          ) : null}
        </div>
      </div>

      {/* Status notes */}
      {user.status === 'blacklisted' ? (
        <div className="flex items-start gap-3 rounded-card border border-navy/15 bg-navy/5 px-5 py-4 text-[15px] text-navy">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <b>Blacklisted</b> on {shortDay(user.blacklistedAt)}
            {user.blacklistedBy ? ` by ${user.blacklistedBy}` : ''}. Reason: {user.blacklistReason || 'No reason given.'}
            <br />
            This user is locked out of the app.
            {user.resubmitFields?.length ? (
              <>
                <br />
                They can resubmit from the app, changing only: <b>{resubmitLabels(user.resubmitFields)}</b>.
              </>
            ) : null}
          </div>
        </div>
      ) : user.status === 'rejected' ? (
        <div className="flex items-start gap-3 rounded-card border border-danger/20 bg-danger/5 px-5 py-4 text-[15px] text-danger">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <b>Rejected</b> on {shortDay(user.rejectedAt)}. Reason: {user.rejectionReason || 'No reason given.'}
            {user.resubmitFields?.length ? (
              <>
                <br />
                They can resubmit from the app, changing only: <b>{resubmitLabels(user.resubmitFields)}</b>.
              </>
            ) : null}
          </div>
        </div>
      ) : user.status === 'under_review' && user.resubmittedFrom ? (
        <div className="flex items-start gap-3 rounded-card border border-brand/25 bg-brand/5 px-5 py-4 text-[15px] text-ink">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-brand" />
          <div>
            <b>Resubmitted</b> on {shortDay(user.resubmittedAt)} after being{' '}
            {user.resubmittedFrom === 'blacklisted' ? 'blacklisted' : 'rejected'}.
            {user.resubmitFields?.length ? <> Updated: <b>{resubmitLabels(user.resubmitFields)}</b>.</> : null}
            <br />
            Earlier reason: {(user.resubmittedFrom === 'blacklisted' ? user.blacklistReason : user.rejectionReason) || '—'}. Check the
            changes, then approve or {user.resubmittedFrom === 'blacklisted' ? 'blacklist' : 'reject'} again.
          </div>
        </div>
      ) : user.status === 'incomplete' ? (
        <div className="flex items-start gap-3 rounded-card border border-line bg-white px-5 py-4 text-[15px] text-muted">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-brand" />
          This user hasn’t finished signing up in the app yet. You can still approve them; they will get access once their sign-up is complete.
        </div>
      ) : null}

      <div className="grid gap-6 md:gap-[27px] xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left column */}
        <div className="flex flex-col gap-6 md:gap-[27px]">
          <Card pad="lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-[17px]">
                <Avatar letter={initial(user)} size={63} rounded="card" />
                <div className="min-w-0">
                  <h2 className={cn('truncate', ui.pageHeading)}>{displayName(user)}</h2>
                  <StatusBadge status={user.status} className="mt-1" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDialog('contact')}
                aria-label="Edit contact information"
                className="grid size-10 shrink-0 place-items-center rounded-control bg-brand/10 text-brand transition hover:bg-brand/20"
              >
                <SquarePen className="size-[18px]" />
              </button>
            </div>
            <h3 className={cn('mt-9', ui.sectionTitle)}>Contact Information</h3>
            <div className="mt-[27px] grid min-w-0 gap-6 md:grid-cols-2">
              <div className="min-w-0">
                <InfoRow icon={Mail} label="Email" value={user.email} />
              </div>
              <div className="min-w-0">
                <InfoRow icon={Phone} label="Phone" value={user.phone} />
              </div>
              <div className="min-w-0 md:col-span-2">
                <InfoRow icon={MapPin} label="Address" value={p?.address} />
              </div>
            </div>
          </Card>

          <SectionCard title="Personal Information" onEdit={() => setDialog('personal')}>
            <div className="grid gap-6 md:grid-cols-2">
              <InfoRow icon={IdCard} label="NRIC" value={p?.nric} />
              <InfoRow icon={User} label="Gender" value={p?.gender} />
              <InfoRow icon={Flag} label="Nationality" value={p?.nationality} />
              <InfoRow icon={Calendar} label="Date of Birth" value={p?.dateOfBirth ? dob(p.dateOfBirth) : null} />
              <InfoRow icon={MapPin} label="Place of Birth" value={p?.placeOfBirth} />
            </div>
          </SectionCard>

          <SectionCard title="Document Verification">
            {documents.length === 0 ? (
              <p className="text-[15px] text-muted">No documents uploaded yet.</p>
            ) : (
              <div className="flex flex-col gap-[18px]">
                {documents.map((d) => (
                  <div key={JSON.stringify(d.ref)} className="flex min-h-[63px] flex-wrap items-center gap-x-4 gap-y-2 rounded-card bg-tile px-[18px] py-3">
                    <div className="flex min-w-0 flex-1 items-center gap-[13px]">
                      {d.ref.kind === 'statement' ? (
                        <FileText className="size-[22px] shrink-0 text-ink" strokeWidth={1.6} />
                      ) : (
                        <IdCard className="size-[22px] shrink-0 text-ink" strokeWidth={1.6} />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-lg font-medium text-ink">{d.label}</p>
                        <p className="truncate text-[13px] text-muted">{d.file.name}</p>
                      </div>
                    </div>
                    <DocStatus status={d.file.status} />
                    {d.file.status === 'verified' ? (
                      <Button variant="navy" size="sm" className="w-[73px]" onClick={() => setDoc({ item: d, mode: 'view' })}>
                        View
                      </Button>
                    ) : (
                      <Button size="sm" className="w-[73px] shadow-none" onClick={() => setDoc({ item: d, mode: 'review' })}>
                        Review
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Payment Information">
            {!payout ? (
              <p className="text-[15px] text-muted">No payout method added yet.</p>
            ) : payout.method === 'paynow' ? (
              <>
                <p className={cn(ui.sectionTitleSm, 'uppercase tracking-wide')}>PayNow</p>
                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <Plain label="PayNow Name" value={payout.paynowName} />
                  <Plain label="PayNow Mobile Number / NRIC" value={payout.paynowId} />
                </div>
              </>
            ) : (
              <>
                <p className={cn(ui.sectionTitleSm, 'uppercase tracking-wide')}>Bank transfer</p>
                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <InfoRow icon={Building} label="Bank Name" value={payout.bankName} />
                  <InfoRow icon={User} label="Account Holder Name" value={payout.accountHolderName} />
                  <InfoRow icon={CreditCard} label="Account Number" value={payout.accountNumber} />
                </div>
              </>
            )}
          </SectionCard>

          {canDecide ? (
            <div className="flex flex-wrap gap-[14px]">
              {user.status !== 'rejected' ? (
                <Button variant="danger" size="lg" className="flex-1 sm:w-[166px] sm:flex-none" onClick={() => setDialog('reject')}>
                  Reject User
                </Button>
              ) : null}
              <Button variant="success" size="lg" className="flex-1 sm:w-[166px] sm:flex-none" loading={approving} onClick={approve}>
                Approve User
              </Button>
            </div>
          ) : null}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6 md:gap-[27px]">
          <UserJobSummary uid={user.uid} email={user.email} />

          <Card pad="lg">
            <h2 className={ui.sectionTitle}>Account Information</h2>
            <dl className={cn('mt-6 flex flex-col gap-[14px]', ui.body)}>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">User ID</dt>
                <dd className="font-medium text-ink">#{shortId(user.uid)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Joined</dt>
                <dd className="font-medium text-ink">{shortDay(user.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Status</dt>
                <dd>
                  <StatusBadge status={user.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Created by</dt>
                <dd className="font-medium text-ink">{user.createdBy === 'admin' ? 'Admin' : 'App sign-up'}</dd>
              </div>
              {user.approvedAt && user.status === 'approved' ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Approved</dt>
                  <dd className={cn('font-medium text-ink')}>{shortDay(user.approvedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </div>
      </div>

      <BlacklistDialog user={user} open={dialog === 'blacklist'} onClose={() => setDialog(null)} />
      <RemoveBlacklistDialog user={user} open={dialog === 'unblacklist'} onClose={() => setDialog(null)} showReason />
      <RejectDialog user={user} open={dialog === 'reject'} onClose={() => setDialog(null)} />
      <EditContactModal user={user} open={dialog === 'contact'} onClose={() => setDialog(null)} />
      <EditPersonalModal user={user} open={dialog === 'personal'} onClose={() => setDialog(null)} />
      {openDoc ? <DocumentReviewModal user={user} document={openDoc} mode={doc!.mode} onClose={() => setDoc(null)} /> : null}
    </PageShell>
  );
}
