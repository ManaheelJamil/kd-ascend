'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy, Plus, RefreshCw, Upload, X } from 'lucide-react';
import { FormSuccessModal } from '@/components/FormSuccessModal';
import { Button, Card, DateInput, ErrorNote, Field, PageShell, Select, TextArea, TextInput, cn, ui } from '@/components/ui';
import { createUser, updateUser } from '@/lib/users';
import { fileSize, generatePassword, isEmail, isNric, toE164 } from '@/lib/format';
import { COUNTRIES, GENDERS, SINGAPORE_BANKS } from '@/lib/options';
import { authErrorMessage } from '@/context/AdminAuth';
import type { Payout, StoredFile, UserDoc } from '@/lib/types';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,application/pdf';

type DocSlot = { id: number; label: string; file: File | null; existing?: StoredFile | null; error?: string };
type Errors = Partial<Record<string, string>>;

function docsFromUser(user: UserDoc): DocSlot[] {
  const slots: DocSlot[] = [];
  let id = 1;
  if (user.identityDocument) {
    slots.push({ id: id++, label: user.identityDocument.label || 'Identity Document', file: null, existing: user.identityDocument });
  }
  (user.documents ?? []).forEach((d) => {
    slots.push({ id: id++, label: d.label || d.name, file: null, existing: d });
  });
  if (!slots.length) slots.push({ id: 1, label: 'Student ID Card', file: null });
  return slots;
}

function formFromUser(user: UserDoc) {
  const p = user.profile;
  const payout = user.payout;
  return {
    fullName: p?.fullName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    address: p?.address ?? '',
    nric: p?.nric ?? '',
    gender: p?.gender ?? '',
    nationality: p?.nationality ?? '',
    dateOfBirth: p?.dateOfBirth ?? '',
    password: '',
    paynowName: payout?.method === 'paynow' ? payout.paynowName : '',
    paynowId: payout?.method === 'paynow' ? payout.paynowId : '',
    bankName: payout?.method === 'bank' ? payout.bankName : '',
    accountHolderName: payout?.method === 'bank' ? payout.accountHolderName : '',
    accountNumber: payout?.method === 'bank' ? payout.accountNumber : '',
  };
}

function DocumentSlot({
  slot,
  onChange,
  onRemove,
  canRemove,
}: {
  slot: DocSlot;
  onChange: (next: DocSlot) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const hasFile = !!slot.file || !!slot.existing;

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) return onChange({ ...slot, error: 'Please choose a PNG, JPG or PDF file.' });
    if (file.size > MAX_BYTES) return onChange({ ...slot, error: 'This file is larger than 5MB.' });
    onChange({ ...slot, file, existing: null, error: undefined });
  };

  const clearFile = () => onChange({ ...slot, file: null, existing: null });

  const displayName = slot.file?.name ?? slot.existing?.name ?? '';
  const displaySize = slot.file?.size ?? slot.existing?.size ?? null;

  return (
    <div className="relative rounded-control border border-field p-[18px]">
      {canRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove document"
          className="absolute -top-3 -right-3 grid size-7 place-items-center rounded-full border border-field bg-white text-muted shadow-sm hover:text-danger"
        >
          <X className="size-4" />
        </button>
      ) : null}
      <input
        value={slot.label}
        onChange={(e) => onChange({ ...slot, label: e.target.value })}
        placeholder="Document Name here"
        className="h-11 w-full rounded-control border border-field px-[18px] text-[15.8px] outline-none placeholder:text-[#0a0a0a]/50 focus:border-brand"
      />
      {hasFile ? (
        <div className="mt-[13px] flex items-center gap-[13px] rounded-control border border-dashed border-dash px-[29px] py-7">
          <span className="grid size-[45px] place-items-center rounded-control bg-brand/10 text-brand">
            <Upload className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15.8px] font-medium text-ink">{displayName}</p>
            {displaySize != null ? <p className="text-[13.5px] text-muted">{fileSize(displaySize)}</p> : null}
            {slot.existing && !slot.file ? <p className="text-[13px] text-muted">Current file on record</p> : null}
          </div>
          <button type="button" onClick={clearFile} aria-label="Remove file" className="text-ink hover:text-danger">
            <X className="size-5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'mt-[13px] flex h-[150px] w-full flex-col items-center justify-center rounded-control border border-dashed transition',
            drag ? 'border-brand bg-brand/5' : 'border-dash hover:bg-page',
          )}
        >
          <Upload className="size-6 text-ink" strokeWidth={1.6} />
          <span className="mt-3 text-[15.8px] font-medium text-ink">Click to upload or drag &amp; drop</span>
          <span className="mt-1 text-[13.5px] font-medium text-muted">PNG, JPG or PDF (max. 5MB)</span>
        </button>
      )}
      {slot.error ? <p className="mt-2 text-[13px] text-danger">{slot.error}</p> : null}
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

function Radio({ checked, label, onSelect }: { checked: boolean; label: string; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className="inline-flex items-center gap-[11px] text-[15.8px] font-semibold text-ink">
      <span className={cn('grid size-[19px] place-items-center rounded-full border-2', checked ? 'border-brand' : 'border-ink/70')}>
        {checked ? <span className="size-[11px] rounded-full bg-brand" /> : null}
      </span>
      {label}
    </button>
  );
}

type UserFormProps = { mode: 'create' } | { mode: 'edit'; user: UserDoc };

export function UserForm(props: UserFormProps) {
  const isEdit = props.mode === 'edit';
  const user = isEdit ? props.user : null;
  const router = useRouter();
  const nextId = useRef(isEdit ? docsFromUser(user!).length + 1 : 2);
  const previousEmail = useMemo(() => (user?.email ?? '').trim().toLowerCase(), [user?.email]);

  const [form, setForm] = useState(() =>
    isEdit
      ? formFromUser(user!)
      : {
          fullName: '',
          email: '',
          phone: '',
          address: '',
          nric: '',
          gender: '',
          nationality: '',
          dateOfBirth: '',
          password: generatePassword(),
          paynowName: '',
          paynowId: '',
          bankName: '',
          accountHolderName: '',
          accountNumber: '',
        },
  );
  const [method, setMethod] = useState<'paynow' | 'bank'>(() =>
    user?.payout?.method === 'bank' ? 'bank' : 'paynow',
  );
  const [bankStatement] = useState<StoredFile | null>(() =>
    user?.payout?.method === 'bank' ? (user.payout.statement ?? null) : null,
  );
  const [docs, setDocs] = useState<DocSlot[]>(() => (isEdit ? docsFromUser(user!) : [{ id: 1, label: 'Student ID Card', file: null }]));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ uid: string; email: string; password: string } | null>(null);
  const [updated, setUpdated] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.fullName.trim()) e.fullName = 'Please enter the full name.';
    if (!isEmail(form.email)) e.email = 'Please enter a valid email address.';
    if (!toE164(form.phone)) e.phone = 'Please enter a valid phone number.';
    if (!form.address.trim()) e.address = 'Please enter the address.';
    if (!isNric(form.nric)) e.nric = 'Please enter a valid NRIC / FIN (e.g. S1234567D).';
    if (!form.gender) e.gender = 'Please select the gender.';
    if (!form.nationality) e.nationality = 'Please select the nationality.';
    if (!form.dateOfBirth) e.dateOfBirth = 'Please select the date of birth.';
    const passwordRequired = !isEdit;
    const passwordTouched = form.password.length > 0;
    if (passwordRequired || passwordTouched) {
      if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    }
    if (method === 'paynow') {
      if (!form.paynowName.trim()) e.paynowName = 'Please enter the PayNow name.';
      if (!form.paynowId.trim()) e.paynowId = 'Please enter the PayNow mobile number or NRIC.';
    } else {
      if (!form.bankName) e.bankName = 'Please select the bank.';
      if (!form.accountHolderName.trim()) e.accountHolderName = 'Please enter the account holder name.';
      if (!/^\d{6,17}$/.test(form.accountNumber.replace(/[\s-]/g, ''))) e.accountNumber = 'Please enter a valid account number.';
    }
    return e;
  };

  const buildPayout = (): Payout =>
    method === 'paynow'
      ? { method: 'paynow', paynowName: form.paynowName.trim(), paynowId: form.paynowId.trim() }
      : {
          method: 'bank',
          bankName: form.bankName,
          accountHolderName: form.accountHolderName.trim(),
          accountNumber: form.accountNumber.replace(/[\s-]/g, ''),
          statement: bankStatement,
        };

  const submit = async () => {
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      setFormError('Please fix the highlighted fields.');
      return;
    }
    const payout = buildPayout();
    const documentPayload = docs
      .filter((d) => d.file || d.existing)
      .map((d) => ({
        label: d.label.trim() || d.file?.name || d.existing?.name || 'Document',
        ...(d.file ? { file: d.file } : { existing: d.existing! }),
      }));
    const newUploads = docs
      .filter((d): d is DocSlot & { file: File } => !!d.file)
      .map((d) => ({ label: d.label.trim() || d.file.name, file: d.file }));

    setSaving(true);
    try {
      if (isEdit && user) {
        await updateUser({
          uid: user.uid,
          previousEmail,
          fullName: form.fullName,
          email: form.email,
          phone: toE164(form.phone)!,
          password: form.password.trim() || undefined,
          address: form.address,
          nric: form.nric,
          gender: form.gender,
          nationality: form.nationality,
          dateOfBirth: form.dateOfBirth,
          placeOfBirth: form.nationality,
          documents: documentPayload,
          payout,
        });
        setUpdated(true);
      } else {
        const uid = await createUser({
          fullName: form.fullName,
          email: form.email,
          phone: toE164(form.phone)!,
          password: form.password,
          address: form.address,
          nric: form.nric,
          gender: form.gender,
          nationality: form.nationality,
          dateOfBirth: form.dateOfBirth,
          placeOfBirth: form.nationality,
          documents: newUploads,
          payout,
        });
        setCreated({ uid, email: form.email.trim().toLowerCase(), password: form.password });
      }
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-in-use') setErrors((x) => ({ ...x, email: 'An account with this email already exists.' }));
      setFormError(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const copyDetails = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(`KD Ascend login\nEmail: ${created.email}\nPassword: ${created.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const backHref = isEdit && user ? `/users/${user.uid}` : '/users';

  return (
    <PageShell variant="detail">
      <div className="flex items-start gap-[18px]">
        <Link href={backHref} aria-label="Back" className="mt-1 grid size-11 shrink-0 place-items-center rounded-full bg-white sm:size-[54px] text-ink hover:bg-line">
          <ArrowLeft className="size-[22px]" />
        </Link>
        <div>
          <h1 className={ui.pageHeading}>{isEdit ? 'Edit User' : 'Add New User'}</h1>
          <p className={ui.pageSubheading}>{isEdit ? 'Update this user account' : 'Create a new user account'}</p>
        </div>
      </div>

      <div className="grid gap-[27px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-[27px]">
          <Card pad="lg">
            <h2 className={ui.sectionTitleSm}>Contact Information</h2>
            <div className="mt-[27px] grid gap-[27px] md:grid-cols-2">
              <Field label="Full Name" required error={errors.fullName} className="md:col-span-2">
                <TextInput placeholder="Enter full name" value={form.fullName} onChange={set('fullName')} invalid={!!errors.fullName} />
              </Field>
              <Field label="Email" required error={errors.email}>
                <TextInput type="email" placeholder="user@example.com" value={form.email} onChange={set('email')} invalid={!!errors.email} />
              </Field>
              <Field label="Phone" required error={errors.phone}>
                <TextInput type="tel" placeholder="9123 4567" value={form.phone} onChange={set('phone')} invalid={!!errors.phone} />
              </Field>
              <Field label="Address" required error={errors.address} className="md:col-span-2">
                <TextArea placeholder="Full address" value={form.address} onChange={set('address')} invalid={!!errors.address} />
              </Field>
              <Field label={isEdit ? 'App Login Password (optional)' : 'App Login Password'} required={!isEdit} error={errors.password} className="md:col-span-2">
                <div className="flex gap-3">
                  <TextInput
                    type={isEdit ? 'password' : 'text'}
                    placeholder={isEdit ? '••••••••' : undefined}
                    value={form.password}
                    onChange={set('password')}
                    invalid={!!errors.password}
                    className="font-mono"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-[53px] shrink-0"
                    onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}
                  >
                    <RefreshCw className="size-4" />
                    Generate
                  </Button>
                </div>
              </Field>
            </div>
          </Card>

          <Card pad="lg">
            <h2 className={ui.sectionTitleSm}>Personal Information</h2>
            <div className="mt-[27px] grid gap-[27px] md:grid-cols-2">
              <Field label="NRIC" required error={errors.nric}>
                <TextInput placeholder="S1234567A" maxLength={9} value={form.nric} onChange={set('nric')} invalid={!!errors.nric} />
              </Field>
              <Field label="Gender" required error={errors.gender}>
                <Select options={GENDERS} value={form.gender} onChange={set('gender')} invalid={!!errors.gender} />
              </Field>
              <Field label="Nationality" required error={errors.nationality}>
                <Select options={COUNTRIES} placeholder="Singaporean" value={form.nationality} onChange={set('nationality')} invalid={!!errors.nationality} />
              </Field>
              <Field label="Date of Birth" required error={errors.dateOfBirth}>
                <DateInput
                  value={form.dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={set('dateOfBirth')}
                  invalid={!!errors.dateOfBirth}
                />
              </Field>
            </div>
          </Card>

          <Card pad="lg">
            <div className="flex items-center justify-between gap-3">
              <h2 className={ui.sectionTitleSm}>Document Upload</h2>
              <Button
                type="button"
                variant="soft"
                className="h-[38px] text-[13.5px]"
                onClick={() => setDocs((d) => [...d, { id: nextId.current++, label: '', file: null }])}
              >
                <Plus className="size-4" />
                Add Document
              </Button>
            </div>
            <div className="mt-[27px] flex flex-col gap-[26px]">
              {docs.map((slot) => (
                <DocumentSlot
                  key={slot.id}
                  slot={slot}
                  canRemove={docs.length > 1}
                  onChange={(next) => setDocs((all) => all.map((d) => (d.id === slot.id ? next : d)))}
                  onRemove={() => setDocs((all) => all.filter((d) => d.id !== slot.id))}
                />
              ))}
            </div>
          </Card>

          <Card pad="lg">
            <div className="flex flex-wrap items-center gap-x-[45px] gap-y-3">
              <h2 className={ui.sectionTitleSm}>Payment Information</h2>
              <Radio checked={method === 'paynow'} label="PAYNOW" onSelect={() => setMethod('paynow')} />
              <Radio checked={method === 'bank'} label="Bank Transfer" onSelect={() => setMethod('bank')} />
            </div>
            {method === 'paynow' ? (
              <div className="mt-[27px] flex flex-col gap-[18px]">
                <Field label="PayNow Name" required error={errors.paynowName}>
                  <TextInput placeholder="Enter PayNow name" value={form.paynowName} onChange={set('paynowName')} invalid={!!errors.paynowName} />
                </Field>
                <Field label="PayNow Mobile Number / NRIC" required error={errors.paynowId}>
                  <TextInput placeholder="123 456 789" value={form.paynowId} onChange={set('paynowId')} invalid={!!errors.paynowId} />
                </Field>
              </div>
            ) : (
              <div className="mt-[27px] flex flex-col gap-[18px]">
                <Field label="Bank Name" required error={errors.bankName}>
                  <Select options={SINGAPORE_BANKS} placeholder="Enter Bank name" value={form.bankName} onChange={set('bankName')} invalid={!!errors.bankName} />
                </Field>
                <Field label="Account Holder Name" required error={errors.accountHolderName}>
                  <TextInput
                    placeholder="Enter account holder name"
                    value={form.accountHolderName}
                    onChange={set('accountHolderName')}
                    invalid={!!errors.accountHolderName}
                  />
                </Field>
                <Field label="Account Number / IBN" required error={errors.accountNumber}>
                  <TextInput placeholder="123 456 789" value={form.accountNumber} onChange={set('accountNumber')} invalid={!!errors.accountNumber} />
                </Field>
              </div>
            )}
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
              {isEdit ? 'Save changes' : 'Create User'}
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
              <p className="font-semibold">Document Upload</p>
              <p className="mt-2 text-white/90">Please upload clear, legible copies of the required documents in PNG, JPG, or PDF format.</p>
            </div>
            <div>
              <p className="font-semibold">Payment Information</p>
              <p className="mt-2 text-white/90">At least one payment method (PayNow Mobile or Bank) should be provided for user payments.</p>
            </div>
            <div>
              <p className="font-semibold">{isEdit ? 'Saving changes' : 'Verification'}</p>
              <p className="mt-2 text-white/90">
                {isEdit
                  ? 'Updates are saved to the user profile immediately. Change email or password only when you intend to update app login credentials.'
                  : 'Users created here are approved straight away. They sign in to the app with the email and the login password above.'}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <FormSuccessModal
        open={!!created}
        onClose={() => setCreated(null)}
        title="User created"
        description="Share these login details with the user so they can sign in to the app."
        footnote="The password is only shown here. Copy it before you close this window."
        details={
          created
            ? [
                { label: 'Email', value: created.email },
                { label: 'Password', value: created.password, mono: true },
              ]
            : undefined
        }
        secondaryAction={{
          label: copied ? 'Copied' : 'Copy login',
          onClick: copyDetails,
          icon: copied ? <Check className="size-5" /> : <Copy className="size-5" />,
        }}
        primaryAction={{
          label: 'View user profile',
          onClick: () => router.push(`/users/${created!.uid}`),
        }}
      />

      <FormSuccessModal
        open={updated}
        onClose={() => setUpdated(false)}
        title="User updated"
        description="Profile and login details were saved successfully."
        secondaryAction={{ label: 'Keep editing', onClick: () => setUpdated(false) }}
        primaryAction={{
          label: 'View user profile',
          onClick: () => router.push(`/users/${user!.uid}`),
        }}
      />
    </PageShell>
  );
}