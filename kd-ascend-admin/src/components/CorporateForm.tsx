'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, ErrorNote } from './ui';
import {
  BackButton,
  CompanyFields,
  ContactFields,
  SectionHeading,
  emptyCorporate,
  validateCompany,
  validateContact,
  type CorporateErrors,
} from './CorporateBits';
import { createCorporate, type CorporateInput } from '@/lib/corporates';

/** Figma "Add Corporate" (536:430): both cards in edit mode, Cancel + Save Changes underneath. */
export default function CorporateForm() {
  const router = useRouter();
  const [form, setForm] = useState<CorporateInput>(emptyCorporate());
  const [errors, setErrors] = useState<CorporateErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<CorporateInput>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(p).forEach((k) => delete next[k as keyof CorporateInput]);
      return next;
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = { ...validateCompany(form), ...validateContact(form) };
    setErrors(errs);
    if (Object.keys(errs).length) {
      setError('Please fix the highlighted fields.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await createCorporate(form);
      router.replace(`/corporates/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-[27px]">
      <div className="flex items-start gap-[18px]">
        <BackButton onClick={() => router.push('/corporates')} />
        <div>
          <h1 className="text-[22px] leading-7 sm:text-[27px] sm:leading-8 font-bold text-ink">Add Corporate</h1>
          <p className="mt-1.5 text-[15.8px] text-muted">Add a corporate partner account</p>
        </div>
      </div>

      <Card className="p-5 sm:p-[28px]">
        <SectionHeading tone="navy" title="Company Information" />
        <div className="mt-[27px]">
          <CompanyFields value={form} onChange={patch} errors={errors} showIndustry />
        </div>
      </Card>

      <Card className="p-5 sm:p-[28px]">
        <SectionHeading tone="orange" title="Contact Person Details" />
        <div className="mt-[27px]">
          <ContactFields value={form} onChange={patch} errors={errors} />
        </div>
      </Card>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div className="flex gap-3 sm:gap-[18px]">
        <Link href="/corporates" className="flex-1 sm:flex-none">
          <Button type="button" variant="outline" className="h-14 w-full rounded-card text-lg font-medium sm:w-40">
            Cancel
          </Button>
        </Link>
        <Button type="submit" loading={busy} className="h-[55px] flex-1 rounded-card text-lg font-medium sm:w-[191px] sm:flex-none">
          Save Changes
        </Button>
      </div>
    </form>
  );
}
