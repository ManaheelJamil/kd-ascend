'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import { Button, ErrorNote, Field, FullPageSpinner, TextInput } from '@/components/ui';
import { authErrorMessage, isSetupDone, useAdminAuth } from '@/context/AdminAuth';
import { isEmail } from '@/lib/format';

/** One-time page: creates the first admin. Locked by the Firestore rules once an admin exists. */
export default function SetupPage() {
  const { createFirstAdmin } = useAdminAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [done, setDone] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isSetupDone()
      .then(setDone)
      .catch(() => setDone(false))
      .finally(() => setChecking(false));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Please enter your name.');
    if (!isEmail(email)) return setError('Please enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await createFirstAdmin(name, email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  if (checking) return <FullPageSpinner />;

  if (done) {
    return (
      <AuthShell title="Setup complete" subtitle="An admin account already exists.">
        <Link href="/login">
          <Button size="lg" className="w-full">
            Go to login
          </Button>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create admin account" subtitle="This is a one-time step. Only the first admin can be created here.">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label="Your name" required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" />
        </Field>
        <Field label="Email" required>
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Password" required>
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm password" required>
          <TextInput
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
            autoComplete="new-password"
          />
        </Field>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <Button type="submit" size="lg" loading={busy} className="mt-1 w-full">
          Create admin
        </Button>
      </form>
    </AuthShell>
  );
}
