'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';

type AdminProfile = { name: string; email: string };

type State = {
  /** True until Firebase has restored the session and the admin check has finished. */
  loading: boolean;
  user: User | null;
  /** Set only when the signed-in account is listed in the `admins` collection. */
  admin: AdminProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** One-time setup: creates the very first admin account. */
  createFirstAdmin: (name: string, email: string, password: string) => Promise<void>;
  /** Updates the signed-in admin's display name (and the header) after a save in Settings. */
  setAdminProfile: (p: Partial<AdminProfile>) => void;
};

const Ctx = createContext<State | null>(null);

export class NotAdminError extends Error {
  constructor() {
    super('This account is not an admin.');
  }
}

async function loadAdmin(user: User): Promise<AdminProfile | null> {
  const snap = await getDoc(doc(db, 'admins', user.uid));
  if (!snap.exists()) return null;
  const data = snap.data() as { name?: string; email?: string };
  // Auth is the source of truth for the email (it changes after the admin confirms a new address).
  return { name: data.name || 'Admin User', email: user.email || data.email || '' };
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (next) => {
        setLoading(true);
        setUser(next);
        if (!next) {
          setAdmin(null);
          setLoading(false);
          return;
        }
        try {
          setAdmin(await loadAdmin(next));
        } catch {
          setAdmin(null);
        } finally {
          setLoading(false);
        }
      }),
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const profile = await loadAdmin(cred.user).catch(() => null);
    if (!profile) {
      await signOut(auth);
      throw new NotAdminError();
    }
    setAdmin(profile);
  }, []);

  const logout = useCallback(() => signOut(auth), []);

  const createFirstAdmin = useCallback(async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    // Both documents are written together; the security rules only allow this while no admin exists yet.
    const batch = writeBatch(db);
    batch.set(doc(db, 'admins', cred.user.uid), {
      name: name.trim(),
      email: cred.user.email,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'config', 'admin'), { setupDone: true, firstAdmin: cred.user.uid, createdAt: serverTimestamp() });
    await batch.commit();
    setAdmin({ name: name.trim(), email: cred.user.email ?? email });
  }, []);

  const setAdminProfile = useCallback(
    (p: Partial<AdminProfile>) => setAdmin((a) => (a ? { ...a, ...p } : a)),
    [],
  );

  const value = useMemo(
    () => ({ loading, user, admin, login, logout, createFirstAdmin, setAdminProfile }),
    [loading, user, admin, login, logout, createFirstAdmin, setAdminProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return ctx;
}

/** Whether the one-time admin setup has already been done. */
export async function isSetupDone(): Promise<boolean> {
  const snap = await getDoc(doc(db, 'config', 'admin'));
  return snap.exists();
}

/** Readable message for Firebase auth / Firestore errors. */
export function authErrorMessage(e: unknown): string {
  if (e instanceof NotAdminError) return 'This account does not have admin access.';
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 8 characters.';
    case 'auth/requires-recent-login':
      return 'For security, please sign out and sign in again, then retry.';
    case 'auth/operation-not-allowed':
      return 'Email change is blocked in Firebase. In Authentication → Settings, allow email changes and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Firebase is not configured. Check the values in .env.local.';
    case 'permission-denied':
      return 'Permission denied. Make sure the latest Firestore rules are published.';
    default:
      return (e as Error)?.message || 'Something went wrong. Please try again.';
  }
}
