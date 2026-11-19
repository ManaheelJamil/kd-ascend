'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CircleCheck, CircleX, Eye, EyeOff, Loader2 } from 'lucide-react';

/**
 * Opened from the "Reset Password →" button in the Password Reset Request email.
 * Looks like the app's Create New Password screen (Figma 141:1327) and talks to /api/fn.
 */

type Phase = 'checking' | 'form' | 'expired' | 'done';

async function callFn<T>(name: string, data: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/fn/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  const body = (await res.json().catch(() => ({}))) as { result?: T; error?: { message?: string } };
  if (!res.ok || body.error) throw new Error(body.error?.message || 'Something went wrong. Please try again.');
  return body.result as T;
}

function validatePassword(p: string) {
  if (!p) return 'Please enter a new password.';
  if (p.length < 8) return 'Password must be at least 8 characters';
  return null;
}

function PasswordField({
  label,
  value,
  onChange,
  error,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[15px] font-medium text-ink">{label}</span>
      <span className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          autoFocus={autoFocus}
          className={`h-[52px] w-full rounded-[12px] border bg-white pr-12 pl-4 text-[16px] text-ink outline-none placeholder:text-[#A7A7A7] focus:border-[#FF8241] ${error ? 'border-danger' : 'border-[#D0D0D0]'}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center text-[#5E5E5E]"
        >
          {show ? <Eye className="size-5" strokeWidth={1.6} /> : <EyeOff className="size-5" strokeWidth={1.6} />}
        </button>
      </span>
      {error ? <span className="text-[13px] text-danger">{error}</span> : null}
    </label>
  );
}

function ResetPassword() {
  const token = useSearchParams().get('token') ?? '';
  const [phase, setPhase] = useState<Phase>('checking');
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null; form?: string | null }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setPhase('expired');
      return;
    }
    callFn<{ status: 'ok' | 'expired'; email?: string | null }>('checkResetToken', { resetToken: token })
      .then((r) => {
        setEmail(r.email ?? null);
        setPhase(r.status === 'ok' ? 'form' : 'expired');
      })
      .catch((e) => {
        setErrors({ form: (e as Error).message });
        setPhase('form');
      });
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      password: validatePassword(password),
      confirm: !confirm ? 'Please confirm your new password.' : confirm !== password ? 'Passwords do not match.' : null,
    };
    setErrors(next);
    if (next.password || next.confirm) return;
    setBusy(true);
    try {
      const r = await callFn<{ status: 'ok' | 'expired' | 'same-password' }>('resetPasswordWithToken', {
        resetToken: token,
        newPassword: password,
      });
      if (r.status === 'ok') setPhase('done');
      else if (r.status === 'expired') setPhase('expired');
      else setErrors({ password: 'Your new password must be different from the previous one.' });
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#242239] sm:grid sm:place-items-center sm:py-10">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-[#242239] sm:min-h-0 sm:rounded-[28px] sm:shadow-2xl">
        {/* Same pattern + logo header as the app and the emails. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/reset/header.jpg" alt="KD Ascend" className="block h-[200px] w-full object-cover object-top" />

        <section className="-mt-6 flex flex-1 flex-col rounded-t-[24px] bg-white px-6 pt-8 pb-8">
          {phase === 'checking' ? (
            <div className="grid flex-1 place-items-center py-16 text-[#5E5E5E]">
              <Loader2 className="size-7 animate-spin text-[#FF8241]" />
            </div>
          ) : phase === 'expired' ? (
            <div className="flex flex-1 flex-col items-center py-8 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-danger/10 text-danger">
                <CircleX className="size-8" />
              </span>
              <h1 className="mt-5 text-[24px] leading-8 font-semibold text-ink">Link Expired</h1>
              <p className="mt-2 text-[15px] leading-6 text-[#5E5E5E]">
                This password reset link is invalid or has expired. Open the KD Ascend app, tap{' '}
                <b className="text-ink">Forgot Password</b> and request a new link.
              </p>
            </div>
          ) : phase === 'done' ? (
            <div className="flex flex-1 flex-col items-center py-8 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-success/10 text-success">
                <CircleCheck className="size-8" />
              </span>
              <h1 className="mt-5 text-[24px] leading-8 font-semibold text-ink">Password Reset Successful</h1>
              <p className="mt-2 text-[15px] leading-6 text-[#5E5E5E]">
                Your password has been updated successfully. You can now log in to the KD Ascend app using your new
                password.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-1 flex-col" noValidate>
              <h1 className="text-[24px] leading-8 font-semibold text-ink">Create New Password</h1>
              <p className="mt-2 text-[15px] leading-6 text-[#5E5E5E]">
                Your new password must be different from the previous one.
                {email ? (
                  <>
                    {' '}
                    Account: <span className="text-ink">{email}</span>
                  </>
                ) : null}
              </p>
              <div className="mt-8 flex flex-col gap-6">
                <PasswordField
                  label="New Password"
                  placeholder="Enter new password"
                  value={password}
                  autoFocus
                  onChange={(v) => {
                    setPassword(v);
                    setErrors((e) => ({ ...e, password: null, form: null }));
                  }}
                  error={errors.password}
                />
                <PasswordField
                  label="Confirm New Password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(v) => {
                    setConfirm(v);
                    setErrors((e) => ({ ...e, confirm: null, form: null }));
                  }}
                  error={errors.confirm}
                />
                {errors.form ? <p className="text-[14px] text-danger">{errors.form}</p> : null}
              </div>
              <div className="mt-auto pt-10">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#FF8241] text-[17px] font-semibold text-white transition hover:bg-[#ff7433] disabled:opacity-70"
                >
                  {busy ? <Loader2 className="size-5 animate-spin" /> : null}
                  Reset Password
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  );
}
