'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { FormSuccessModal } from '@/components/FormSuccessModal';
import { Button, Card, ErrorNote, PageShell, cn, ui } from '@/components/ui';
import {
  CompanyFields,
  ContactFields,
  emptyCorporate,
  toInput,
  validateCompany,
  validateContact,
  type CorporateErrors,
} from '@/components/CorporateBits';
import {
  corporateStatusLabel,
  createCorporate,
  updateCorporate,
  type Corporate,
  type CorporateInput,
} from '@/lib/corporates';

type CorporateFormProps = { mode: 'create' } | { mode: 'edit'; corporate: Corporate };

export function CorporateForm(props: CorporateFormProps) {
  const isEdit = props.mode === 'edit';
  const corporate = isEdit ? props.corporate : null;
  const router = useRouter();

  const [form, setForm] = useState<CorporateInput>(() => (isEdit ? toInput(corporate!) : emptyCorporate()));
  const [errors, setErrors] = useState<CorporateErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [created, setCreated] = useState<{
    id: string;
    name: string;
    contactEmail: string;
    contactPhone: string;
    status: string;
  } | null>(null);

  const patch = (p: Partial<CorporateInput>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(p).forEach((k) => delete next[k as keyof CorporateInput]);
      return next;
    });
  };

  const backHref = isEdit && corporate ? `/corporates/${corporate.id}` : '/corporates';
  const viewHref = isEdit && corporate ? `/corporates/${corporate.id}` : backHref;

  const submit = async () => {
    setFormError(null);
    const errs = { ...validateCompany(form), ...validateContact(form) };
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFormError('Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && corporate) {
        await updateCorporate(corporate.id, form);
        setSaved(true);
      } else {
        const id = await createCorporate(form);
        setCreated({
          id,
          name: form.name.trim(),
          contactEmail: form.contactEmail.trim().toLowerCase(),
          contactPhone: form.contactPhone.trim(),
          status: corporateStatusLabel(form.status),
        });
      }
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell variant="detail">
      <div className="flex items-start gap-[18px]">
        <Link
          href={backHref}
          aria-label="Back"
          className="mt-1 grid size-11 shrink-0 place-items-center rounded-full bg-white sm:size-[54px] text-ink hover:bg-line"
        >
          <ArrowLeft className="size-[22px]" />
        </Link>
        <div>
          <h1 className={ui.pageHeading}>{isEdit ? 'Edit Corporate' : 'Add Corporate'}</h1>
          <p className={ui.pageSubheading}>
            {isEdit ? 'Update this corporate partner account' : 'Add a corporate partner account'}
          </p>
        </div>
      </div>

      <div className="grid gap-[27px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-[27px]">
          <Card pad="lg">
            <h2 className={ui.sectionTitleSm}>Company Information</h2>
            <div className="mt-[27px]">
              <CompanyFields value={form} onChange={patch} errors={errors} showIndustry />
            </div>
          </Card>

          <Card pad="lg">
            <h2 className={ui.sectionTitleSm}>Contact Person Details</h2>
            <div className="mt-[27px]">
              <ContactFields value={form} onChange={patch} errors={errors} />
            </div>
          </Card>

          {formError ? <ErrorNote>{formError}</ErrorNote> : null}

          <div className="flex items-center gap-[14px]">
            <Button
              variant="outline"
              className={ui.formCancel}
              onClick={() => router.push(backHref)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button className="h-[51px] min-w-[162px] font-semibold" onClick={submit} loading={saving}>
              {isEdit ? 'Save changes' : 'Create Corporate'}
            </Button>
          </div>
        </div>

        <aside className="h-fit rounded-card bg-linear-to-b from-navy to-navy-2 p-[27px] text-white xl:sticky xl:top-[135px]">
          <h2 className={cn(ui.sectionTitleSm, 'text-white')}>Instructions</h2>
          <div className="mt-6 flex flex-col gap-[22px] text-[13.5px] leading-[18px]">
            <div>
              <p className="font-semibold">Required Fields</p>
              <p className="mt-2 text-white/90">All fields marked with * are mandatory and must be filled out.</p>
            </div>
            <div>
              <p className="font-semibold">Company Information</p>
              <p className="mt-2 text-white/90">
                Enter the legal or trading name, status, and office location. Industry is optional but helps organize partners.
              </p>
            </div>
            <div>
              <p className="font-semibold">Contact Person</p>
              <p className="mt-2 text-white/90">
                Provide the main point of contact for this corporate. Use a valid email and phone number your team can reach.
              </p>
            </div>
            <div>
              <p className="font-semibold">Status</p>
              <p className="mt-2 text-white/90">
                Pending partners are not live yet. Active partners can post jobs. Inactive partners are paused without deletion.
              </p>
            </div>
            <div>
              <p className="font-semibold">{isEdit ? 'Saving changes' : 'After creating'}</p>
              <p className="mt-2 text-white/90">
                {isEdit
                  ? 'Updates are saved to this corporate record immediately.'
                  : 'After you create the partner, a confirmation appears with key details and a link to their profile.'}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <FormSuccessModal
        open={!!created}
        onClose={() => setCreated(null)}
        title="Corporate created"
        description="The partner is in your corporates list. You can post jobs once their status is Active."
        details={
          created
            ? [
                { label: 'Company', value: created.name },
                { label: 'Contact email', value: created.contactEmail },
                { label: 'Contact phone', value: created.contactPhone },
                { label: 'Status', value: created.status },
              ]
            : undefined
        }
        secondaryAction={{
          label: 'Add another',
          onClick: () => {
            setCreated(null);
            setForm(emptyCorporate());
            setErrors({});
            setFormError(null);
          },
        }}
        primaryAction={{
          label: 'View corporate profile',
          onClick: () => router.push(`/corporates/${created!.id}`),
        }}
      />

      <FormSuccessModal
        open={saved}
        onClose={() => setSaved(false)}
        title="Corporate updated"
        description="Company and contact details were saved successfully."
        secondaryAction={{ label: 'Keep editing', onClick: () => setSaved(false) }}
        primaryAction={{
          label: 'View corporate profile',
          onClick: () => router.push(viewHref),
        }}
      />
    </PageShell>
  );
}