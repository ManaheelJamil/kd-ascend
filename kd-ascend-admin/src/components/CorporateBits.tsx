'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, ChevronDown, Mail, MapPin, Phone, SquarePen, Tag, Trash2, Users } from 'lucide-react';
import { Button, Modal, cn } from './ui';
import {
  CORPORATE_STATUSES,
  INDUSTRIES,
  corporateStatusLabel,
  deleteCorporate,
  updateCorporate,
  type Corporate,
  type CorporateInput,
  type CorporateStatus,
} from '@/lib/corporates';
import { isEmail } from '@/lib/format';

/* ---------- Status ---------- */

const BADGE: Record<CorporateStatus, string> = {
  pending: 'bg-brand/10 text-brand',
  active: 'bg-success/10 text-success',
  inactive: 'bg-muted/10 text-muted',
};

export function CorporateStatusBadge({ status, className }: { status: CorporateStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[27px] items-center rounded-full px-[11px] text-[13.5px] font-medium whitespace-nowrap',
        BADGE[status] ?? BADGE.pending,
        className,
      )}
    >
      {corporateStatusLabel(status)}
    </span>
  );
}

/** The "Active ▾" pill in the details header: changes the status straight away. */
export function StatusPicker({ value, onChange, busy }: { value: CorporateStatus; onChange: (s: CorporateStatus) => void; busy?: boolean }) {
  return (
    <label className={cn('relative inline-flex h-[38px] items-center rounded-full pr-9 pl-4 text-[15.8px] font-medium', BADGE[value], busy && 'opacity-60')}>
      <span>{corporateStatusLabel(value)}</span>
      <ChevronDown className="pointer-events-none absolute right-3 size-4" />
      <select
        aria-label="Corporate status"
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value as CorporateStatus)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {CORPORATE_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------- Section header (icon tile + title) ---------- */

export function SectionHeading({ tone, title, children }: { tone: 'navy' | 'orange'; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            'grid size-[45px] place-items-center rounded-card text-white',
            tone === 'navy' ? 'bg-linear-to-r from-navy to-[#2e2558]' : 'bg-linear-to-r from-brand to-[#ff6a3a]',
          )}
        >
          {tone === 'navy' ? <Building2 className="size-[22px]" strokeWidth={1.8} /> : <Users className="size-[22px]" strokeWidth={1.8} />}
        </span>
        <h2 className="text-[20.3px] font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function InfoTile({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: React.ElementType;
  tint: 'navy' | 'purple' | 'orange' | 'green';
  label: string;
  value?: string;
}) {
  const tints = {
    navy: 'bg-navy/10 text-navy',
    purple: 'bg-[#faf5ff] text-[#9810fa]',
    orange: 'bg-brand/10 text-brand',
    green: 'bg-success/10 text-success',
  };
  return (
    <div className="flex min-w-0 items-start gap-[13px]">
      <span className={cn('grid size-[45px] shrink-0 place-items-center rounded-card', tints[tint])}>
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-[15.8px] text-muted">{label}</p>
        <p className="mt-0.5 text-lg font-medium break-words text-ink">{value || '—'}</p>
      </div>
    </div>
  );
}


/* ---------- Validation ---------- */

export type CorporateErrors = Partial<Record<keyof CorporateInput, string>>;

export function validateCompany(v: Pick<CorporateInput, 'name' | 'status'>): CorporateErrors {
  const e: CorporateErrors = {};
  if (!v.name.trim()) e.name = 'Please enter the company name.';
  if (!v.status) e.status = 'Please choose a status.';
  return e;
}

export function validateContact(v: Pick<CorporateInput, 'contactName' | 'contactEmail' | 'contactPhone'>): CorporateErrors {
  const e: CorporateErrors = {};
  if (!v.contactName.trim()) e.contactName = 'Please enter the contact person’s name.';
  if (!isEmail(v.contactEmail)) e.contactEmail = 'Please enter a valid email address.';
  if (v.contactPhone.replace(/\D/g, '').length < 7) e.contactPhone = 'Please enter a valid phone number.';
  return e;
}

const statusLabels = CORPORATE_STATUSES.map((s) => s.label);
export const labelToStatus = (label: string): CorporateStatus =>
  CORPORATE_STATUSES.find((s) => s.label === label)?.value ?? 'pending';

/* ---------- Form fields (Figma: label 15.8 Medium ink, 52px inputs, 17.5 radius, 18px text) ---------- */

const corpControl =
  'h-[52px] w-full rounded-card border border-field bg-white px-[18px] text-lg font-medium text-ink outline-none transition placeholder:font-normal placeholder:text-[#0a0a0a]/50 focus:border-brand focus:ring-2 focus:ring-brand/15';

export function CorpField({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('flex flex-col gap-3', className)}>
      <span className="text-[15.8px] font-medium text-ink">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
      {error ? <span className="-mt-1.5 text-[13px] text-danger">{error}</span> : null}
    </label>
  );
}

export function CorpInput({
  icon: Icon,
  invalid,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ElementType; invalid?: boolean }) {
  return (
    <div className="relative">
      {Icon ? <Icon className="pointer-events-none absolute top-1/2 left-[18px] size-[18px] -translate-y-1/2 text-muted" /> : null}
      <input {...rest} className={cn(corpControl, Icon && 'pl-[45px]', invalid && 'border-danger', className)} />
    </div>
  );
}

export function CorpSelect({
  options,
  value,
  onChange,
  placeholder = 'Select',
  invalid,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(corpControl, 'appearance-none pr-12 font-normal', !value && 'text-[#0a0a0a]/50', invalid && 'border-danger')}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o} className="text-ink">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-[18px] size-5 -translate-y-1/2 text-muted" />
    </div>
  );
}

/**
 * Company fields. layout "grid" (Add / Edit page): Name | Status, then Location full width.
 * layout "stack" (pop-up): one column. Industry only where asked for (Add page).
 */
export function CompanyFields({
  value,
  onChange,
  errors,
  layout = 'grid',
  showIndustry = false,
}: {
  value: CorporateInput;
  onChange: (patch: Partial<CorporateInput>) => void;
  errors: CorporateErrors;
  layout?: 'grid' | 'stack';
  showIndustry?: boolean;
}) {
  const grid = layout === 'grid';
  return (
    <div className={cn('grid gap-y-[18px]', grid && 'gap-x-5 md:grid-cols-2')}>
      <CorpField label="Name" required error={errors.name}>
        <CorpInput placeholder="Tech Corp Inc." value={value.name} onChange={(e) => onChange({ name: e.target.value })} invalid={!!errors.name} />
      </CorpField>
      <CorpField label="Status" required error={errors.status}>
        <CorpSelect
          options={statusLabels}
          placeholder="Pending"
          value={corporateStatusLabel(value.status)}
          onChange={(v) => onChange({ status: labelToStatus(v) })}
          invalid={!!errors.status}
        />
      </CorpField>
      {showIndustry ? (
        <CorpField label="Industry" className={grid ? 'md:col-span-2' : undefined}>
          <CorpSelect options={INDUSTRIES} placeholder="Select industry" value={value.industry} onChange={(v) => onChange({ industry: v })} />
        </CorpField>
      ) : null}
      <CorpField label="Location" className={grid ? 'md:col-span-2' : undefined}>
        <CorpInput
          placeholder="296 E 10th Street, Santee 96816"
          value={value.location}
          onChange={(e) => onChange({ location: e.target.value })}
        />
      </CorpField>
    </div>
  );
}

/** Contact fields. "grid": Name full width, then Email | Phone. "stack": one column. */
export function ContactFields({
  value,
  onChange,
  errors,
  layout = 'grid',
}: {
  value: CorporateInput;
  onChange: (patch: Partial<CorporateInput>) => void;
  errors: CorporateErrors;
  layout?: 'grid' | 'stack';
}) {
  const grid = layout === 'grid';
  return (
    <div className={cn('grid gap-y-[18px]', grid && 'gap-x-[26px] md:grid-cols-2')}>
      <CorpField label="Contact Person Name" required error={errors.contactName} className={grid ? 'md:col-span-2' : undefined}>
        <CorpInput
          placeholder="John Smith"
          value={value.contactName}
          onChange={(e) => onChange({ contactName: e.target.value })}
          invalid={!!errors.contactName}
        />
      </CorpField>
      <CorpField label="Contact Email" required error={errors.contactEmail}>
        <CorpInput
          icon={Mail}
          type="email"
          placeholder="john.smith@techcorp.com"
          value={value.contactEmail}
          onChange={(e) => onChange({ contactEmail: e.target.value })}
          invalid={!!errors.contactEmail}
        />
      </CorpField>
      <CorpField label="Contact Phone" required error={errors.contactPhone}>
        <CorpInput
          icon={Phone}
          type="tel"
          placeholder="+1 555-0110"
          value={value.contactPhone}
          onChange={(e) => onChange({ contactPhone: e.target.value })}
          invalid={!!errors.contactPhone}
        />
      </CorpField>
    </div>
  );
}

/** Figma: Cancel (outlined) + Save Changes (orange, shadow), equal halves. */
export function SaveCancel({ onCancel, busy, height = 47 }: { onCancel: () => void; busy?: boolean; height?: 47 | 56 }) {
  const h = height === 56 ? 'h-14' : 'h-[47px]';
  return (
    <div className={cn('grid grid-cols-2', height === 56 ? 'gap-[18px]' : 'gap-[19px]')}>
      <Button type="button" variant="outline" onClick={onCancel} className={cn(h, 'rounded-card text-lg font-medium')}>
        Cancel
      </Button>
      <Button type="submit" loading={busy} className={cn(h, 'rounded-card text-lg font-medium')}>
        Save Changes
      </Button>
    </div>
  );
}

/** Figma: 40×40 outlined square with the pen icon (top-right of each card). */
export function SectionEditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-10 place-items-center rounded-card border border-field text-ink transition hover:bg-page"
    >
      <SquarePen className="size-[18px]" />
    </button>
  );
}

/** Figma: 45×45 outlined back button. */
export function BackButton({ onClick, href }: { onClick?: () => void; href?: string }) {
  const cls = 'mt-1 grid size-[45px] shrink-0 place-items-center rounded-card border border-field bg-white text-ink transition hover:bg-page';
  if (href)
    return (
      <a href={href} aria-label="Back" className={cls}>
        <ArrowLeft className="size-5" />
      </a>
    );
  return (
    <button type="button" onClick={onClick} aria-label="Back" className={cls}>
      <ArrowLeft className="size-5" />
    </button>
  );
}

/** Read-only company card body (details page and Edit page). */
export function CompanyInfoGrid({ c }: { c: Pick<CorporateInput, 'name' | 'industry' | 'location'> }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <InfoTile icon={Building2} tint="navy" label="Name" value={c.name} />
      <InfoTile icon={Tag} tint="purple" label="Industry" value={c.industry} />
      <InfoTile icon={MapPin} tint="orange" label="Location" value={c.location} />
    </div>
  );
}

/** Read-only contact card body. */
export function ContactInfoGrid({ c }: { c: Pick<CorporateInput, 'contactName' | 'contactEmail' | 'contactPhone'> }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <InfoTile icon={Users} tint="navy" label="Contact Person Name" value={c.contactName} />
      <InfoTile icon={Mail} tint="orange" label="Contact Email" value={c.contactEmail} />
      <InfoTile icon={Phone} tint="green" label="Contact Phone" value={c.contactPhone} />
    </div>
  );
}

export const emptyCorporate = (): CorporateInput => ({
  name: '',
  industry: '',
  location: '',
  status: 'pending',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
});

export const toInput = (c: Corporate): CorporateInput => ({
  name: c.name ?? '',
  industry: c.industry ?? '',
  location: c.location ?? '',
  status: c.status ?? 'pending',
  contactName: c.contactName ?? '',
  contactEmail: c.contactEmail ?? '',
  contactPhone: c.contactPhone ?? '',
});

/* ---------- Edit modals (details page pencils) ---------- */

export function EditSectionModal({
  corporate,
  section,
  onClose,
}: {
  corporate: Corporate;
  section: 'company' | 'contact' | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CorporateInput>(toInput(corporate));
  const [errors, setErrors] = useState<CorporateErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (section) {
      setForm(toInput(corporate));
      setErrors({});
      setError(null);
    }
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

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
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!section} onClose={onClose} className="max-w-[519px] rounded-card border border-line">
      <form onSubmit={save} className="flex flex-col gap-[27px] p-7">
        <SectionHeading tone={section === 'company' ? 'navy' : 'orange'} title={section === 'company' ? 'Company Information' : 'Contact Person Details'} />
        {section === 'company' ? (
          <CompanyFields value={form} onChange={patch} errors={errors} layout="stack" />
        ) : (
          <ContactFields value={form} onChange={patch} errors={errors} layout="stack" />
        )}
        {error ? <p className="-mt-3 text-sm text-danger">{error}</p> : null}
        <SaveCancel onCancel={onClose} busy={busy} />
      </form>
    </Modal>
  );
}

export function DeleteCorporateDialog({ corporate, onClose, onDone }: { corporate: Corporate | null; onClose: () => void; onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!corporate) return null;
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteCorporate(corporate.id);
      onDone?.();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose}>
      <div className="p-8">
        <div className="flex items-start gap-[13px]">
          <span className="grid size-[54px] shrink-0 place-items-center rounded-full bg-[#ffe2e2] text-danger">
            <Trash2 className="size-6" />
          </span>
          <div>
            <h2 className="text-[22.5px] leading-8 font-bold text-ink">Delete Corporate</h2>
            <p className="text-[13.5px] text-muted">This can’t be undone</p>
          </div>
        </div>
        <p className="mt-[17px] text-lg text-muted">
          Delete <b className="font-semibold text-ink">{corporate.name}</b> and its contact details? Consider setting it to Inactive instead if you may need it later.
        </p>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <Button variant="danger" size="lg" className="flex-1" loading={busy} onClick={run}>
            Delete Corporate
          </Button>
          <Button variant="outline" size="lg" onClick={onClose} className="font-medium">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
