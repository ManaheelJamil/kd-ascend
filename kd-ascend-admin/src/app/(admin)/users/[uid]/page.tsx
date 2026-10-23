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
import { Avatar, Button, Card, ErrorNote, FullPageSpinner, StatusBadge, cn } from '@/components/ui';
import { BlacklistDialog, RejectDialog, RemoveBlacklistDialog } from '@/components/UserDialogs';
import DocumentReviewModal from '@/components/DocumentReviewModal';
import { EditContactModal, EditPersonalModal } from '@/components/EditUserModals';
import { approveUser, listDocuments, subscribeUser, type UserDocument } from '@/lib/users';
import { displayName, dob, initial, longDay, shortDay, shortId } from '@/lib/format';
import type { UserDoc } from '@/lib/types';

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex min-w-0 items-start gap-[13px]">
      <Icon className="mt-0.5 size-[22px] shrink-0 text-brand" strokeWidth={1.8} />
      <div className="min-w-0">
        <p className="text-[13.5px] text-muted">{label}</p>
        <p className="text-[15.8px] font-medium break-words text-ink">{value || '—'}</p>
      </div>
    </div>
  );
}

function Plain({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[13.5px] text-muted">{label}</p>
      <p className="mt-1.5 text-[15.8px] font-medium break-words text-ink">{value || '—'}</p>
    </div>
  );
}

function SectionCard({ title, onEdit, children }: { title: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-[37px]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[20.3px] font-bold text-ink">{title}</h2>
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
      <div className="mt-[30px]">{children}</div>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[15.8px] text-white">{label}</span>
      <span className="text-[22.5px] font-bold text-white">{value}</span>
    </div>
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
    <div className="flex flex-col gap-6 md:gap-[40px]">
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
            <h1 className="text-[22px] leading-7 sm:text-[27px] sm:leading-8 font-bold text-ink">User ID : {shortId(user.uid)}</h1>
            <p className="mt-1 text-lg text-muted">Joined on {longDay(user.createdAt)}</p>
          </div>
        </div>
        {user.status === 'blacklisted' ? (
          <Button variant="success" className="h-[51px] px-6 font-semibold" onClick={() => setDialog('unblacklist')}>
            <ShieldCheck className="size-5" />
            Remove from Blacklist
          </Button>
        ) : user.status === 'approved' ? (
          <Button variant="danger" size="lg" onClick={() => setDialog('blacklist')}>
            Blacklist User
          </Button>
        ) : null}
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
          </div>
        </div>
      ) : user.status === 'rejected' ? (
        <div className="flex items-start gap-3 rounded-card border border-danger/20 bg-danger/5 px-5 py-4 text-[15px] text-danger">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <b>Rejected</b> on {shortDay(user.rejectedAt)}. Reason: {user.rejectionReason || 'No reason given.'}
          </div>
        </div>
      ) : user.status === 'incomplete' ? (
        <div className="flex items-start gap-3 rounded-card border border-line bg-white px-5 py-4 text-[15px] text-muted">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-brand" />
          This user hasn’t finished signing up in the app yet. You can still approve them; they will get access once their sign-up is complete.
        </div>
      ) : null}

      <div className="grid gap-6 md:gap-[36px] xl:grid-cols-[minmax(0,1fr)_322px]">
        {/* Left column */}
        <div className="flex flex-col gap-6 md:gap-[36px]">
          <Card className="p-5 sm:p-[37px]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-[17px]">
                <Avatar letter={initial(user)} size={63} rounded="card" />
                <div className="min-w-0">
                  <h2 className="truncate text-[22px] font-bold sm:text-[27px] text-ink">{displayName(user)}</h2>
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
            <h3 className="mt-9 text-[20.3px] font-bold text-ink">Contact Information</h3>
            <div className="mt-[30px] grid gap-6 md:grid-cols-2">
              <Info icon={Mail} label="Email" value={user.email} />
              <Info icon={Phone} label="Phone" value={user.phone} />
              <div className="md:col-span-2">
                <Info icon={MapPin} label="Address" value={p?.address} />
              </div>
            </div>
          </Card>

          <SectionCard title="Personal Information" onEdit={() => setDialog('personal')}>
            <div className="grid gap-6 md:grid-cols-2">
              <Info icon={IdCard} label="NRIC" value={p?.nric} />
              <Info icon={User} label="Gender" value={p?.gender} />
              <Info icon={Flag} label="Nationality" value={p?.nationality} />
              <Info icon={Calendar} label="Date of Birth" value={p?.dateOfBirth ? dob(p.dateOfBirth) : null} />
              <Info icon={MapPin} label="Place of Birth" value={p?.placeOfBirth} />
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
                <p className="text-base font-bold text-ink">PAYNOW</p>
                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <Plain label="PayNow Name" value={payout.paynowName} />
                  <Plain label="PayNow Mobile Number / NRIC" value={payout.paynowId} />
                </div>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-ink">BANK TRANSFER</p>
                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <Info icon={Building} label="Bank Name" value={payout.bankName} />
                  <Info icon={User} label="Account Holder Name" value={payout.accountHolderName} />
                  <Info icon={CreditCard} label="Account Number" value={payout.accountNumber} />
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
        <div className="flex flex-col gap-6 md:gap-[36px]">
          <div className="rounded-card bg-brand p-[27px]">
            <h2 className="text-[20.3px] font-bold text-white">Summary</h2>
            <div className="mt-[30px] flex flex-col gap-[26px]">
              <SummaryRow label="Total Jobs" value="0" />
              <SummaryRow label="Completed" value="0" />
              <SummaryRow label="Canceled" value="0" />
            </div>
            <div className="my-[26px] h-px bg-white/40" />
            <div className="flex flex-col gap-[26px]">
              <SummaryRow label="Total Earnings" value="$0.00" />
              <SummaryRow label="Total Penalties" value="$0.00" />
              <SummaryRow label="Net Earnings" value="$0.00" />
            </div>
          </div>

          <Card className="p-[27px]">
            <h2 className="text-[20.3px] font-bold text-ink">Recent Jobs</h2>
            <div className="mt-6 rounded-card bg-tile px-[18px] py-6 text-center text-[13.5px] text-muted">
              No jobs yet. Jobs will appear here once the Jobs module is live.
            </div>
          </Card>

          <Card className="p-[27px]">
            <h2 className="text-[20.3px] font-bold text-ink">Account Information</h2>
            <dl className="mt-6 flex flex-col gap-[14px] text-[15.8px]">
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
    </div>
  );
}
