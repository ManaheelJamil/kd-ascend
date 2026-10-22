'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { BriefcaseBusiness, CircleCheck, Trash2 } from 'lucide-react';
import { Button, Card, ErrorNote, FullPageSpinner } from '@/components/ui';
import {
  BackButton,
  CompanyInfoGrid,
  ContactInfoGrid,
  DeleteCorporateDialog,
  EditSectionModal,
  SectionEditButton,
  SectionHeading,
  StatusPicker,
} from '@/components/CorporateBits';
import { setCorporateStatus, subscribeCorporate, type Corporate, type CorporateStatus } from '@/lib/corporates';
import { isoDay } from '@/lib/format';

export default function CorporateDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [corporate, setCorporate] = useState<Corporate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<'company' | 'contact' | null>(null);
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

  return (
    <div className="flex flex-col gap-[27px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-[18px]">
          <BackButton onClick={() => router.push('/corporates')} />
          <div>
            <h1 className="text-[27px] leading-8 font-bold text-ink">{corporate.name}</h1>
            <p className="mt-1.5 text-[15.8px] text-muted">Joined on: {isoDay(corporate.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-[22px]">
          <span className="inline-flex items-center gap-2 text-[15.8px] text-muted">
            <span className="grid size-[31px] place-items-center rounded-control bg-success/10 text-success">
              <CircleCheck className="size-4" />
            </span>
            Completed Jobs <b className="text-xl text-ink">{corporate.completedJobs ?? 0}</b>
          </span>
          <span className="inline-flex items-center gap-2 text-[15.8px] text-muted">
            <span className="grid size-[31px] place-items-center rounded-control bg-brand/10 text-brand">
              <BriefcaseBusiness className="size-4" />
            </span>
            Active Jobs <b className="text-xl text-ink">{corporate.activeJobs ?? 0}</b>
          </span>
          <StatusPicker value={corporate.status} onChange={changeStatus} busy={statusBusy} />
        </div>
      </div>

      <Card className="p-[28px]">
        <SectionHeading tone="navy" title="Company Information">
          <SectionEditButton label="Edit company information" onClick={() => setEditing('company')} />
        </SectionHeading>
        <div className="mt-[27px]">
          <CompanyInfoGrid c={corporate} />
        </div>
      </Card>

      <Card className="p-[28px]">
        <SectionHeading tone="orange" title="Contact Person Details">
          <SectionEditButton label="Edit contact person" onClick={() => setEditing('contact')} />
        </SectionHeading>
        <div className="mt-[27px]">
          <ContactInfoGrid c={corporate} />
        </div>
      </Card>

      <div>
        <Button variant="ghost" className="text-danger hover:bg-danger/5" onClick={() => setDeleting(true)}>
          <Trash2 className="size-[18px]" />
          Delete corporate
        </Button>
      </div>

      <EditSectionModal corporate={corporate} section={editing} onClose={() => setEditing(null)} />
      <DeleteCorporateDialog
        corporate={deleting ? corporate : null}
        onClose={() => setDeleting(false)}
        onDone={() => router.replace('/corporates')}
      />
    </div>
  );
}
