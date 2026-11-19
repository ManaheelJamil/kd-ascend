import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb, ConfigError } from '@/server/admin';

/**
 * POST /api/admin/users/update-auth — Firebase Auth email and/or password for an end user.
 *   headers: Authorization: Bearer <admin Firebase ID token>
 *   body:    { uid, email?, password? }
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const header = req.headers.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 });

    let callerUid: string;
    try {
      callerUid = (await adminAuth().verifyIdToken(token)).uid;
    } catch (e) {
      if (e instanceof ConfigError) throw e;
      return NextResponse.json({ error: 'Sign in again.' }, { status: 401 });
    }
    const isAdmin = (await adminDb().doc(`admins/${callerUid}`).get()).exists;
    if (!isAdmin) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as { uid?: unknown; email?: unknown; password?: unknown };
    const uid = typeof body.uid === 'string' ? body.uid : '';
    if (!uid) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

    const patch: { email?: string; password?: string } = {};
    if (typeof body.email === 'string' && body.email.trim()) {
      patch.email = body.email.trim().toLowerCase();
    }
    if (typeof body.password === 'string' && body.password.length >= 8) {
      patch.password = body.password;
    }
    if (!patch.email && !patch.password) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await adminAuth().updateUser(uid, patch);
    if (patch.email) {
      await adminDb().doc(`users/${uid}`).set({ email: patch.email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }
    if (e instanceof ConfigError) {
      return NextResponse.json({ error: 'Server is not configured for auth updates.' }, { status: 503 });
    }
    console.error('[api/admin/users/update-auth]', e);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}