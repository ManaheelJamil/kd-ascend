'use client';

import { useEffect, useState } from 'react';
import { Button, DateInput, Field, Modal, ModalClose, Select, TextArea, TextInput } from './ui';
import { updateContact, updatePersonal } from '@/lib/users';
import { isNric, toE164 } from '@/lib/format';
import { COUNTRIES, GENDERS } from '@/lib/options';
import type { UserDoc } from '@/lib/types';

type Props = { user: UserDoc; open: boolean; onClose: () => void };

function Footer({ busy, error, onClose }: { busy: boolean; error: string | null; onClose: () => void }) {
  return (
    <>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="outline" size="lg" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="lg" loading={busy}>
          Save Changes
        </Button>
      </div>
    </>
  );
}

export function EditContactModal({ user, open, onClose }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName(user.profile?.fullName ?? '');
    setPhone(user.phone ?? '');
    setAddress(user.profile?.address ?? '');
    setError(null);
  }, [open, user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const e164 = toE164(phone);
    if (!fullName.trim()) return setError('Please enter the full name.');
    if (!e164) return setError('Please enter a valid phone number.');
    setBusy(true);
    try {
      await updateContact(user.uid, { fullName: fullName.trim(), phone: e164, address: address.trim() }, user);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-[600px]">
      <ModalClose onClose={onClose} />
      <form onSubmit={save} className="flex flex-col gap-5 p-8">
        <h2 className="text-[22.5px] font-bold">Edit Contact Information</h2>
        <Field label="Full Name" required>
          <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Email">
          <TextInput value={user.email} disabled className="bg-page text-muted" />
        </Field>
        <Field label="Phone" required>
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Address">
          <TextArea value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Footer busy={busy} error={error} onClose={onClose} />
      </form>
    </Modal>
  );
}

export function EditPersonalModal({ user, open, onClose }: Props) {
  const [nric, setNric] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNric(user.profile?.nric ?? '');
    setGender(user.profile?.gender ?? '');
    setNationality(user.profile?.nationality ?? '');
    setDateOfBirth(user.profile?.dateOfBirth ?? '');
    setPlaceOfBirth(user.profile?.placeOfBirth ?? '');
    setError(null);
  }, [open, user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nric && !isNric(nric)) return setError('Please enter a valid NRIC / FIN (e.g. S1234567D).');
    setBusy(true);
    try {
      await updatePersonal(user.uid, { nric: nric.trim().toUpperCase(), gender, nationality, dateOfBirth, placeOfBirth }, user);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-[600px]">
      <ModalClose onClose={onClose} />
      <form onSubmit={save} className="flex flex-col gap-5 p-8">
        <h2 className="text-[22.5px] font-bold">Edit Personal Information</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="NRIC">
            <TextInput value={nric} onChange={(e) => setNric(e.target.value)} maxLength={9} />
          </Field>
          <Field label="Gender">
            <Select options={GENDERS} value={gender} onChange={(e) => setGender(e.target.value)} />
          </Field>
          <Field label="Nationality">
            <Select options={COUNTRIES} value={nationality} onChange={(e) => setNationality(e.target.value)} />
          </Field>
          <Field label="Date of Birth">
            <DateInput value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </Field>
          <Field label="Place of Birth" className="sm:col-span-2">
            <Select options={COUNTRIES} value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} />
          </Field>
        </div>
        <Footer busy={busy} error={error} onClose={onClose} />
      </form>
    </Modal>
  );
}
