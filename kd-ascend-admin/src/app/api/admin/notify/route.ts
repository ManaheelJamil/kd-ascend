import { NextResponse } from 'next/server';
import { adminAuth, adminDb, ConfigError } from '@/server/admin';
import { notifyUser } from '@/server/otp';
import type { TemplateName } from '@/server/emailTemplates';

/**
 * POST /api/admin/notify — emails a user after an admin action in the dashboard.
 *   headers: Authorization: Bearer <admin's Firebase ID token>
 *   body:    { uid, event: 'approved' | 'rejected' | 'blacklisted' | 'restored', reason? }
 * Only accounts listed in /admins can call it.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EVENTS: Record<string, TemplateName> = {
  approved: 'accountApproved',
  rejected: 'accountRejected',
  blacklisted: 'accountBlacklisted',
  restored: 'accountRestored',
};

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

    const body = (await req.json().catch(() => ({}))) as { uid?: unknown; event?: unknown; reason?: unknown };
    const uid = typeof body.uid === 'string' ? body.uid : '';
    const template = typeof body.event === 'string' ? EVENTS[body.event] : undefined;
    if (!uid || !template) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null;

    const sent = await notifyUser(uid, template, { reason });
    return NextResponse.json({ sent });
  } catch (e) {
    if (e instanceof ConfigError) return NextResponse.json({ sent: false, error: 'Email server not set up.' }, { status: 503 });
    console.error('[api/admin/notify]', e);
    return NextResponse.json({ sent: false, error: 'Something went wrong.' }, { status: 500 });
  }
}
