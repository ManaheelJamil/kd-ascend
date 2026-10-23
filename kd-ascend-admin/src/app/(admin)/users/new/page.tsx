'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy, Plus, RefreshCw, Upload, User, X } from 'lucide-react';
import { Button, Card, DateInput, ErrorNote, Field, Modal, Select, TextArea, TextInput, cn } from '@/components/ui';
import { createUser } from '@/lib/users';
import { fileSize, generatePassword, isEmail, isNric, toE164 } from '@/lib/format';
import { COUNTRIES, GENDERS, SINGAPORE_BANKS } from '@/lib/options';
import { authErrorMessage } from '@/context/AdminAuth';
import type { Payout } from '@/lib/types';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,application/pdf';

type DocSlot = { id: number; label: string; file: File | null; error?: string };
type Errors = Partial<Record<string, string>>;

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

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) return onChange({ ...slot, error: 'Please choose a PNG, JPG or PDF file.' });
    if (file.size > MAX_BYTES) return onChange({ ...slot, error: 'This file is larger than 5MB.' });
    onChange({ ...slot, file, error: undefined });
  };

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
      {slot.file ? (
        <div className="mt-[13px] flex items-center gap-[13px] rounded-control border border-dashed border-dash px-[29px] py-7">
          <span className="grid size-[45px] place-items-center rounded-control bg-brand/10 text-brand">
            <Upload className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15.8px] font-medium text-ink">{slot.file.name}</p>
            <p className="text-[13.5px] text-muted">{fileSize(slot.file.size)}</p>
          </div>
          <button type="button" onClick={() => onChange({ ...slot, file: null })} aria-label="Remove file" className="text-ink hover:text-danger">
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

export default function AddUserPage() {
  const router = useRouter();
  const nextId = useRef(2);
  const [form, setForm] = useState({
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
  });
  const [method, setMethod] = useState<'paynow' | 'bank'>('paynow');
  const [docs, setDocs] = useState<DocSlot[]>([{ id: 1, label: 'Student ID Card', file: null }]);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ uid: string; email: string; password: string } | null>(null);
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
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
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

  const submit = async () => {
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      setFormError('Please fix the highlighted fields.');
      return;
    }
    const payout: Payout =
      method === 'paynow'
        ? { method: 'paynow', paynowName: form.paynowName.trim(), paynowId: form.paynowId.trim() }
        : {
            method: 'bank',
            bankName: form.bankName,
            accountHolderName: form.accountHolderName.trim(),
            accountNumber: form.accountNumber.replace(/[\s-]/g, ''),
            statement: null,
          };
    setSaving(true);
    try {
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
        documents: docs.filter((d) => d.file).map((d) => ({ label: d.label.trim() || d.file!.name, file: d.file! })),
        payout,
      });
      setCreated({ uid, email: form.email.trim().toLowerCase(), password: form.password });
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

  return (
    <div className="flex flex-col gap-6 md:gap-[40px]">
      <div className="flex items-start gap-[18px]">
        <Link href="/users" aria-label="Back" className="mt-1 grid size-11 shrink-0 place-items-center rounded-full bg-white sm:size-[54px] text-ink hover:bg-line">
          <ArrowLeft className="size-[22px]" />
        </Link>
        <div>
          <h1 className="text-[22px] leading-7 sm:text-[27px] sm:leading-8 font-bold text-ink">Add New User</h1>
          <p className="mt-1.5 text-[13.5px] text-muted">Create a new user account</p>
        </div>
      </div>

      <div className="grid gap-[27px] xl:grid-cols-[minmax(0,700px)_336px]">
        <div className="flex flex-col gap-[27px]">
          <Card className="flex items-center gap-[18px] p-5 sm:p-[28px]">
            <span className="grid size-[54px] shrink-0 place-items-center rounded-card bg-linear-to-r from-brand to-brand-light text-white">
              <User className="size-[27px]" strokeWidth={1.8} />
            </span>
            <Field label="Full Name" required error={errors.fullName} className="flex-1">
              <TextInput placeholder="Enter full name" value={form.fullName} onChange={set('fullName')} invalid={!!errors.fullName} />
            </Field>
          </Card>

          <Card className="p-5 sm:p-[28px]">
            <h2 className="text-lg font-bold text-ink">Contact Information</h2>
            <div className="mt-[27px] grid gap-[27px] md:grid-cols-2">
              <Field label="Email" required error={errors.email}>
                <TextInput type="email" placeholder="user@example.com" value={form.email} onChange={set('email')} invalid={!!errors.email} />
              </Field>
              <Field label="Phone" required error={errors.phone}>
                <TextInput type="tel" placeholder="9123 4567" value={form.phone} onChange={set('phone')} invalid={!!errors.phone} />
              </Field>
              <Field label="Address" required error={errors.address} className="md:col-span-2">
                <TextArea placeholder="Full address" value={form.address} onChange={set('address')} invalid={!!errors.address} />
              </Field>
              <Field label="App Login Password" required error={errors.password} className="md:col-span-2">
                <div className="flex gap-3">
                  <TextInput value={form.password} onChange={set('password')} invalid={!!errors.password} className="font-mono" />
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

          <Card className="p-5 sm:p-[28px]">
            <h2 className="text-lg font-bold text-ink">Personal Information</h2>
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

          <Card className="p-5 sm:p-[28px]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">Document Upload</h2>
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

          <Card className="p-5 sm:p-[28px]">
            <div className="flex flex-wrap items-center gap-x-[45px] gap-y-3">
              <h2 className="text-lg font-bold text-ink">Payment Information</h2>
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
            <Button variant="ghost" className="h-[51px] px-7" onClick={() => router.push('/users')} disabled={saving}>
              Cancel
            </Button>
            <Button className="h-[51px] w-[162px] font-semibold" onClick={submit} loading={saving}>
              Create User
            </Button>
          </div>
        </div>

        <aside className="h-fit rounded-card bg-linear-to-b from-navy to-navy-2 p-[27px] text-white xl:sticky xl:top-[135px]">
          <h2 className="text-lg font-bold">Instructions</h2>
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
              <p className="font-semibold">Verification</p>
              <p className="mt-2 text-white/90">
                Users created here are approved straight away. They sign in to the app with the email and the login password above.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <Modal open={!!created} onClose={() => router.push(`/users/${created?.uid}`)}>
        <div className="p-8">
          <span className="grid size-[54px] place-items-center rounded-full bg-[#dcfce7] text-success">
            <Check className="size-7" />
          </span>
          <h2 className="mt-4 text-[22.5px] font-bold">User created</h2>
          <p className="mt-1 text-[15px] text-muted">Share these login details with the user. The password is not shown again.</p>
          <div className="mt-5 rounded-control bg-tile p-4 font-mono text-[14.5px] leading-7">
            <div>Email: {created?.email}</div>
            <div>Password: {created?.password}</div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" size="lg" onClick={copyDetails} className="flex-1">
              {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
              {copied ? 'Copied' : 'Copy details'}
            </Button>
            <Button size="lg" className="flex-1" onClick={() => router.push(`/users/${created?.uid}`)}>
              View user
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
