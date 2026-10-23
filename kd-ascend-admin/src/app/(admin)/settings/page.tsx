'use client';

import { useEffect, useRef, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, verifyBeforeUpdateEmail } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CircleCheck, Eye, EyeOff, Pencil, User } from 'lucide-react';
import { Button, Card, cn } from '@/components/ui';
import { CorpField, CorpInput } from '@/components/CorporateBits';
import { authErrorMessage, useAdminAuth } from '@/context/AdminAuth';
import { auth, db } from '@/lib/firebase';
import { imageFileToDataUrl } from '@/lib/settings';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<'name' | 'email' | 'oldPassword' | 'newPassword' | 'confirmPassword', string>>;

function PasswordInput({
  value,
  onChange,
  invalid,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <CorpInput
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="*********"
        autoComplete={autoComplete}
        invalid={invalid}
        className="pr-12 font-normal"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute top-1/2 right-4 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-ink"
      >
        {show ? <Eye className="size-5" strokeWidth={1.6} /> : <EyeOff className="size-5" strokeWidth={1.6} />}
      </button>
    </div>
  );
}

/** Figma "Setting" (542:1964): company logo, admin details and password. */
export default function SettingsPage() {
  const { user, admin, setAdminProfile } = useAdminAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string[]>([]);

  useEffect(() => {
    setName(admin?.name ?? '');
    setEmail(admin?.email ?? user?.email ?? '');
  }, [admin?.name, admin?.email, user?.email]);

  const clear = (k: keyof Errors) => setErrors((e) => ({ ...e, [k]: undefined }));

  const pickPhoto = () => fileRef.current?.click();

  /** Saves (or removes) the admin's profile photo straight away and updates the header avatar. */
  const savePhoto = async (photo: string | null) => {
    if (!user) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      await updateDoc(doc(db, 'admins', user.uid), { photo, updatedAt: serverTimestamp() });
      setAdminProfile({ photo });
      setNotice([photo ? 'Profile photo updated.' : 'Profile photo removed.']);
    } catch (err) {
      setPhotoError(authErrorMessage(err));
    } finally {
      setPhotoBusy(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    try {
      await savePhoto(await imageFileToDataUrl(file, { square: 320 }));
    } catch (err) {
      setPhotoError((err as Error).message);
    }
  };

  const currentEmail = (user?.email ?? '').toLowerCase();
  const emailChanged = email.trim().toLowerCase() !== currentEmail;
  const passwordChanging = !!(newPassword || confirmPassword);

  const validate = (): Errors => {
    const errs: Errors = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!EMAIL_RE.test(email.trim())) errs.email = 'Enter a valid email address';
    if ((emailChanged || passwordChanging) && !oldPassword)
      errs.oldPassword = emailChanged && !passwordChanging
        ? 'Enter your current password to change your email'
        : 'Enter your current password';
    if (passwordChanging) {
      if (newPassword.length < 8) errs.newPassword = 'Use at least 8 characters';
      else if (newPassword === oldPassword) errs.newPassword = 'New password must be different';
      if (confirmPassword !== newPassword) errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const errs = validate();
    setErrors(errs);
    setNotice([]);
    setError(null);
    if (Object.values(errs).some(Boolean)) return;

    setBusy(true);
    const done: string[] = [];
    try {
      if (name.trim() !== (admin?.name ?? '')) {
        await updateDoc(doc(db, 'admins', user.uid), { name: name.trim(), updatedAt: serverTimestamp() });
        setAdminProfile({ name: name.trim() });
        done.push('Admin name updated.');
      }

      if (emailChanged || passwordChanging) {
        try {
          await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', oldPassword));
        } catch (err) {
          const code = (err as { code?: string }).code ?? '';
          if (['auth/invalid-credential', 'auth/wrong-password', 'auth/invalid-login-credentials'].includes(code)) {
            setErrors({ oldPassword: 'Old password is incorrect' });
            return;
          }
          throw err;
        }

        if (passwordChanging) {
          await updatePassword(user, newPassword);
          done.push('Password changed.');
        }
        if (emailChanged) {
          const next = email.trim().toLowerCase();
          await verifyBeforeUpdateEmail(user, next);
          await updateDoc(doc(db, 'admins', user.uid), { pendingEmail: next, updatedAt: serverTimestamp() });
          done.push(
            `We sent a confirmation link to ${next}. Your login email changes once you open that link; until then keep using ${user.email}.`,
          );
        }
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      setNotice(done.length ? done : ['Nothing to save — no changes made.']);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
      // Keep the saved items visible even if a later step failed.
      if (done.length) setNotice(done);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-[22.5px]" noValidate>
      <h1 className="text-[22.5px] leading-8 font-bold text-ink">Setting</h1>

      {/* Profile photo — also shown in the top-right corner of every page */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-[50px]">
        <div className="flex flex-col items-center gap-2.5 sm:pl-[21px]">
          <div className="relative size-[176px] shrink-0">
            <div className="grid size-full place-items-center overflow-hidden rounded-full bg-[#f5f2f2]">
              {admin?.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={admin.photo} alt="Profile photo" className="size-full object-cover" />
              ) : (
                <User className="size-20 text-muted/50" strokeWidth={1.4} />
              )}
              {photoBusy ? <span className="absolute inset-0 grid place-items-center rounded-full bg-white/60 text-sm text-muted">Saving…</span> : null}
            </div>
            <button
              type="button"
              onClick={pickPhoto}
              disabled={photoBusy}
              aria-label="Change profile photo"
              className="absolute right-0.5 bottom-3 grid size-10 place-items-center rounded-[10px] bg-[#fff2ed] text-brand ring-4 ring-page transition hover:bg-brand hover:text-white"
            >
              <Pencil className="size-[18px]" strokeWidth={2} />
            </button>
          </div>
          <p className="text-[20.75px] leading-[23px] font-semibold text-ink">Profile Photo</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto">
          <div className="flex gap-3 sm:gap-4">
            <Button type="button" onClick={pickPhoto} loading={photoBusy} className="flex-1 shadow-brand sm:w-[168px] sm:flex-none">
              Upload New
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:w-[168px] sm:flex-none"
              disabled={!admin?.photo || photoBusy}
              onClick={() => savePhoto(null)}
            >
              Remove
            </Button>
          </div>
          <p className="text-sm text-muted">JPG, PNG or WebP. Saved straight away.</p>
          {photoError ? <p className="text-sm text-danger">{photoError}</p> : null}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} />
      </div>

      {/* Admin details */}
      <Card className="flex flex-col gap-[27px] rounded-[18px] p-5 sm:p-[28px]">
        <h2 className="text-[20.25px] leading-8 font-bold text-ink">Admin Details</h2>
        <div className="grid gap-[27px] md:grid-cols-2">
          <CorpField label="Name" required error={errors.name}>
            <CorpInput
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clear('name');
              }}
              placeholder="Admin User"
              autoComplete="name"
              invalid={!!errors.name}
              className="font-normal"
            />
          </CorpField>
          <CorpField label="Email" required error={errors.email}>
            <CorpInput
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clear('email');
              }}
              placeholder="name@company.com"
              autoComplete="email"
              invalid={!!errors.email}
            />
          </CorpField>
        </div>
      </Card>

      {/* Password */}
      <Card className="flex flex-col gap-[27px] rounded-[18px] p-5 sm:p-[28px]">
        <h2 className="text-[20.25px] leading-8 font-bold text-ink">Password</h2>
        <CorpField label="Old Password" error={errors.oldPassword}>
          <PasswordInput
            value={oldPassword}
            onChange={(v) => {
              setOldPassword(v);
              clear('oldPassword');
            }}
            invalid={!!errors.oldPassword}
            autoComplete="current-password"
          />
        </CorpField>
        <div className="grid gap-[27px] md:grid-cols-2">
          <CorpField label="New Password" error={errors.newPassword}>
            <PasswordInput
              value={newPassword}
              onChange={(v) => {
                setNewPassword(v);
                clear('newPassword');
              }}
              invalid={!!errors.newPassword}
              autoComplete="new-password"
            />
          </CorpField>
          <CorpField label="Confirm Password" error={errors.confirmPassword}>
            <PasswordInput
              value={confirmPassword}
              onChange={(v) => {
                setConfirmPassword(v);
                clear('confirmPassword');
              }}
              invalid={!!errors.confirmPassword}
              autoComplete="new-password"
            />
          </CorpField>
        </div>
      </Card>

      {notice.length ? (
        <div className="flex flex-col gap-1.5 rounded-card border border-success/20 bg-success/5 px-5 py-4 text-[15px] text-success">
          {notice.map((n) => (
            <p key={n} className="flex items-start gap-2">
              <CircleCheck className="mt-0.5 size-4 shrink-0" />
              {n}
            </p>
          ))}
        </div>
      ) : null}
      {error ? <p className={cn('rounded-card bg-danger/5 px-5 py-4 text-[15px] text-danger')}>{error}</p> : null}

      <div>
        <Button type="submit" loading={busy} className="w-full shadow-brand sm:w-[168px]">
          Save Changes
        </Button>
      </div>

    </form>
  );
}
