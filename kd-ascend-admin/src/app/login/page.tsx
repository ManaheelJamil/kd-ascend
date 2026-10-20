'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import AuthShell from '@/components/AuthShell';
import { Button, ErrorNote, Field, TextInput } from '@/components/ui';
import { authErrorMessage, isSetupDone, useAdminAuth } from '@/context/AdminAuth';
import { isFirebaseConfigured } from '@/lib/firebase';

function LoginForm() {
  const { admin, loading, login } = useAdminAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (!loading && admin) router.replace(next.startsWith('/') ? next : '/dashboard');
  }, [loading, admin, router, next]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    isSetupDone()
      .then((done) => setNeedsSetup(!done))
      .catch(() => setNeedsSetup(false));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError('Please enter your email and password.');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Admin Login" subtitle="Sign in to manage KD Ascend users">
      {!isFirebaseConfigured ? (
        <div className="mb-5">
          <ErrorNote>Firebase isn’t configured yet. Copy .env.local.example to .env.local and fill in your web app values.</ErrorNote>
        </div>
      ) : null}
      {needsSetup ? (
        <div className="mb-5 rounded-control bg-brand/10 px-4 py-3 text-[14px] text-ink">
          No admin account exists yet.{' '}
          <Link href="/setup" className="font-semibold text-brand underline">
            Create the first admin
          </Link>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label="Email">
          <TextInput
            type="email"
            autoComplete="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <div className="relative">
            <TextInput
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-muted"
            >
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </Field>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <Button type="submit" size="lg" loading={busy} className="mt-1 w-full">
          Login
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
