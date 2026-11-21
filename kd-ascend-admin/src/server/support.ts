import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb, mailSettings } from './admin';
import { sendPlain } from './email';
import { FnError } from './otp';

type Handler = (data: Record<string, unknown>, uid: string | null) => Promise<unknown>;

/** Issue types offered by the app's "Report an Issue" screen (Figma 196:5071). */
export const ISSUE_TYPES = ['Booking Issue', 'Payment Issue', 'Account Issue', 'App Problem', 'Other'] as const;

const REPORT_COOLDOWN_MS = 60 * 1000;

function signedIn(uid: string | null): string {
  if (!uid) throw new FnError('unauthenticated', 'Please sign in again.');
  return uid;
}

/**
 * Help & Support for the mobile app:
 *   supportInfo  – where users can reach the admin team (SUPPORT_EMAIL / SUPPORT_PHONE on Vercel).
 *   reportIssue  – saves the report in Firestore (supportReports) and emails it to the support inbox.
 */
export const supportHandlers: Record<string, Handler> = {
  async supportInfo() {
    const email = (process.env.SUPPORT_EMAIL || process.env.SMTP_USER || '').trim();
    const phone = (process.env.SUPPORT_PHONE || '').trim();
    return { email: email || null, phone: phone || null };
  },

  async reportIssue(data, uidOrNull) {
    const uid = signedIn(uidOrNull);
    const type = typeof data.type === 'string' ? data.type.trim() : '';
    const message = typeof data.message === 'string' ? data.message.trim() : '';
    if (!(ISSUE_TYPES as readonly string[]).includes(type)) {
      throw new FnError('invalid-argument', 'Please choose the issue type.');
    }
    if (message.length < 10) throw new FnError('invalid-argument', 'Please describe the issue (at least 10 characters).');
    if (message.length > 2000) throw new FnError('invalid-argument', 'Please keep the description under 2000 characters.');

    const db = adminDb();
    // One report a minute per user (stops accidental double taps and spam).
    // (Single-field query, no composite index needed; a user has few reports.)
    const mine = await db.collection('supportReports').where('uid', '==', uid).get();
    const lastAt = Math.max(0, ...mine.docs.map((d) => d.get('createdAt')?.toMillis?.() ?? 0));
    if (lastAt && Date.now() - lastAt < REPORT_COOLDOWN_MS) {
      throw new FnError('failed-precondition', 'You just sent a report. Please wait a minute before sending another.');
    }

    const user = await adminAuth().getUser(uid);
    const profile = (await db.collection('users').doc(uid).get()).data() as
      | { profile?: { fullName?: string }; phone?: string; userId?: string }
      | undefined;
    const name = profile?.profile?.fullName || user.displayName || user.email || uid;
    const ref = await db.collection('supportReports').add({
      uid,
      name,
      email: user.email ?? null,
      phone: profile?.phone ?? null,
      type,
      message,
      status: 'open',
      createdAt: FieldValue.serverTimestamp(),
    });

    try {
      const cfg = mailSettings();
      await sendPlain(
        cfg,
        cfg.supportEmail,
        `[${cfg.appName}] ${type} from ${name}`,
        [
          `${name} reported an issue in the ${cfg.appName} app.`,
          '',
          `Type: ${type}`,
          `Email: ${user.email ?? '—'}`,
          `Phone: ${profile?.phone ?? '—'}`,
          `Report ID: ${ref.id}`,
          '',
          message,
        ].join('\n'),
        user.email,
      );
    } catch (e) {
      // The report is saved either way; the email is a convenience.
      console.error('[reportIssue] email not sent:', e);
    }
    return { status: 'sent', id: ref.id };
  },
};
