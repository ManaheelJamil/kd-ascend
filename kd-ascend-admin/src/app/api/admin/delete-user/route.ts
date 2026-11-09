import { NextResponse } from 'next/server';
import { adminAuth, adminDb, ConfigError } from '@/server/admin';

/**
 * POST /api/admin/delete-user — permanently deletes a mobile-app user.
 *   headers: Authorization: Bearer <admin's Firebase ID token>
 *   body:    { uid }
 * Removes the login account (Firebase Auth), the profile (users/{uid}), every uploaded file
 * (userFiles owned by the user, with their chunks) and any pending codes / reset links.
 * Only accounts listed in /admins can call it, and an admin account can't be deleted here.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OTP_PREFIXES = ['verify_email', 'reset_password', 'reset_sms_test', 'reset_link'];

export async function POST(req: Request) {
  try {
    const header = req.headers.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    let callerUid: string;
    try {
      callerUid = (await adminAuth().verifyIdToken(token)).uid;
    } catch (e) {
      if (e instanceof ConfigError) throw e;
      return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    }
    const db = adminDb();
    if (!(await db.doc(`admins/${callerUid}`).get()).exists) {
      return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as { uid?: unknown };
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    if (!uid || uid.includes('/')) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    if (uid === callerUid || (await db.doc(`admins/${uid}`).get()).exists) {
      return NextResponse.json({ error: 'Admin accounts can’t be deleted here.' }, { status: 400 });
    }

    // Uploaded files (ID documents, bank statements) and their chunks.
    const files = await db.collection('userFiles').where('owner', '==', uid).get();
    for (const f of files.docs) await db.recursiveDelete(f.ref);

    // Pending codes and reset links.
    await Promise.all(OTP_PREFIXES.map((p) => db.doc(`otp/${p}_${uid}`).delete().catch(() => undefined)));
    const tokens = await db.collection('resetTokens').where('uid', '==', uid).get();
    await Promise.all(tokens.docs.map((t) => t.ref.delete()));

    // Profile, then the login account.
    await db.recursiveDelete(db.doc(`users/${uid}`));
    try {
      await adminAuth().deleteUser(uid);
    } catch (e) {
      if ((e as { code?: string }).code !== 'auth/user-not-found') throw e;
    }

    return NextResponse.json({ deleted: true });
  } catch (e) {
    if (e instanceof ConfigError) {
      return NextResponse.json({ error: 'The server isn’t set up (FIREBASE_SERVICE_ACCOUNT).' }, { status: 503 });
    }
    console.error('[api/admin/delete-user]', e);
    return NextResponse.json({ error: 'Could not delete the user. Please try again.' }, { status: 500 });
  }
}
