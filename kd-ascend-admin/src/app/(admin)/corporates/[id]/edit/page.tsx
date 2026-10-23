'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Card, ErrorNote, FullPageSpinner } from '@/components/ui';
import {
  BackButton,
  CompanyFields,
  CompanyInfoGrid,
  ContactFields,
  ContactInfoGrid,
  SaveCancel,
  SectionEditButton,
  SectionHeading,
  toInput,
  validateCompany,
  validateContact,
  type CorporateErrors,
} from '@/components/CorporateBits';
import { subscribeCorporate, updateCorporate, type Corporate, type CorporateInput } from '@/lib/corporates';

type Section = 'company' | 'contact';

/**
 * Figma "Edit Corporate" (502:1257 / 502:1544): one card is open for editing
 * (fields + full-width Cancel | Save Changes inside the card); the other shows
 * the saved values with its pen button. Opens on the company card unless ?section=contact.
 */
function EditCorporate() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const [corporate, setCorporate] = useState<Corporate | null | undefined>(undefined);
  const [section, setSection] = useState<Section | null>(params.get('section') === 'contact' ? 'contact' : 'company');
  const [form, setForm] = useState<CorporateInput | null>(null);
  const [errors, setErrors] = useState<CorporateErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeCorporate(
        id,
        (c) => setCorporate(c),
        (e) => setError(e.message),
      ),
    [id],
  );

  // Fresh copy of the saved values whenever a card is opened.
  useEffect(() => {
    if (corporate && section) {
      setForm(toInput(corporate));
      setErrors({});
      setError(null);
    }
  }, [section, corporate?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && corporate === undefined) return <ErrorNote>{error}</ErrorNote>;
  if (corporate === undefined || (section && !form)) return <FullPageSpinner />;
  if (corporate === null)
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">Corporate not found</p>
        <Link href="/corporates" className="mt-3 inline-block text-brand underline">
          Back to corporates
        </Link>
      </div>
    );

  const patch = (p: Partial<CorporateInput>) => {
    setForm((f) => (f ? { ...f, ...p } : f));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(p).forEach((k) => delete next[k as keyof CorporateInput]);
      return next;
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !section) return;
    const errs = section === 'company' ? validateCompany(form) : validateContact(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError(null);
    try {
      await updateCorporate(
        corporate.id,
        section === 'company'
          ? { name: form.name, status: form.status, location: form.location }
          : { contactName: form.contactName, contactEmail: form.contactEmail, contactPhone: form.contactPhone },
      );
      setSection(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const open = (s: Section) => {
    setSection(s);
    setForm(toInput(corporate));
  };

  return (
    <div className="flex flex-col gap-[27px]">
      <div className="flex items-start gap-[18px]">
        <BackButton onClick={() => router.push(`/corporates/${corporate.id}`)} />
        <div>
          <h1 className="text-[22px] leading-7 sm:text-[27px] sm:leading-8 font-bold text-ink">Edit Corporate</h1>
          <p className="mt-1.5 text-[15.8px] text-muted">Edit corporate partner account</p>
        </div>
      </div>

      <Card className="p-5 sm:p-[28px]">
        {section === 'company' && form ? (
          <form onSubmit={save} className="flex flex-col gap-[27px]">
            <SectionHeading tone="navy" title="Company Information" />
            <CompanyFields value={form} onChange={patch} errors={errors} />
            {error ? <p className="-mt-3 text-sm text-danger">{error}</p> : null}
            <SaveCancel onCancel={() => setSection(null)} busy={busy} height={56} />
          </form>
        ) : (
          <div className="flex flex-col gap-[27px]">
            <SectionHeading tone="navy" title="Company Information">
              <SectionEditButton label="Edit company information" onClick={() => open('company')} />
            </SectionHeading>
            <CompanyInfoGrid c={corporate} />
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-[28px]">
        {section === 'contact' && form ? (
          <form onSubmit={save} className="flex flex-col gap-[27px]">
            <SectionHeading tone="orange" title="Contact Person Details" />
            <ContactFields value={form} onChange={patch} errors={errors} />
            {error ? <p className="-mt-3 text-sm text-danger">{error}</p> : null}
            <SaveCancel onCancel={() => setSection(null)} busy={busy} height={56} />
          </form>
        ) : (
          <div className="flex flex-col gap-[27px]">
            <SectionHeading tone="orange" title="Contact Person Details">
              <SectionEditButton label="Edit contact person" onClick={() => open('contact')} />
            </SectionHeading>
            <ContactInfoGrid c={corporate} />
          </div>
        )}
      </Card>
    </div>
  );
}

export default function EditCorporatePage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <EditCorporate />
    </Suspense>
  );
}
