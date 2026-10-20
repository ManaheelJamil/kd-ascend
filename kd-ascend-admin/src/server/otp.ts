import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { UserRecord } from 'firebase-admin/auth';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { adminAuth, adminDb, mailSettings } from './admin';
import { sendResetEmail, sendVerificationEmail, type MailConfig } from './email';

/**
 * Same behaviour as the Cloud Functions in the mobile project (functions/src/index.ts),
 * running inside this Next.js app instead so it works on Firebase's free plan.
 *
 * Codes are stored hashed in otp/{purpose}_{uid} (clients can't read them — see firestore.rules),
 * expire after 10 minutes, can be resent every 30 seconds, and lock for 30 minutes after 5 wrong tries.
 */

/** Error with a Firebase-style code; the app's error messages are keyed on these. */
export class FnError extends Error {
  constructor(
    public code:
      | 'invalid-argument'
      | 'unauthenticated'
      | 'not-found'
      | 'failed-precondition'
      | 'permission-denied'
      | 'unavailable'
      | 'internal',
    message: string,
  ) {
    super(message);
  }
}

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_S = 30;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 30 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

type Purpose = 'verify_email' | 'reset_password';

type SendResult =
  | { status: 'sent'; destination: string; cooldownSeconds: number }
  | { status: 'cooldown'; destination: string; retryAfterSeconds: number }
  | { status: 'locked'; retryAfterSeconds: number }
  | { status: 'already-verified' };

type VerifyResult =
  | { status: 'ok' }
  | { status: 'incorrect'; attemptsLeft: number }
  | { status: 'locked'; retryAfterSeconds: number }
  | { status: 'expired' };

type OtpDoc = {
  uid: string;
  purpose: Purpose;
  codeHash: string | null;
  salt: string | null;
  expiresAt: Timestamp | null;
  attempts: number;
  lockedUntil: Timestamp | null;
  lastSentAt: Timestamp | null;
};

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const secondsUntil = (t: Timestamp, now: number) => Math.max(1, Math.ceil((t.toMillis() - now) / 1000));
const otpRef = (purpose: Purpose, uid: string) => adminDb().collection('otp').doc(`${purpose}_${uid}`);
const isE164 = (v: string) => /^\+[1-9]\d{7,14}$/.test(v);

export function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function requireString(data: Record<string, unknown>, key: string, max = 320): string {
  const value = data[key];
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new FnError('invalid-argument', `Missing or invalid "${key}".`);
  }
  return value.trim();
}

function requireCode(data: Record<string, unknown>) {
  const code = requireString(data, 'code', 6);
  if (!/^\d{6}$/.test(code)) throw new FnError('invalid-argument', 'The code must be 6 digits.');
  return code;
}

async function findUser(identifier: string): Promise<UserRecord | null> {
  try {
    if (identifier.includes('@')) return await adminAuth().getUserByEmail(identifier.toLowerCase());
    if (!isE164(identifier)) throw new FnError('invalid-argument', 'Please enter a valid email address or phone number.');
    return await adminAuth().getUserByPhoneNumber(identifier);
  } catch (e) {
    if ((e as { code?: string }).code === 'auth/user-not-found') return null;
    throw e;
  }
}

async function issueCode(
  purpose: Purpose,
  user: UserRecord,
  send: (cfg: MailConfig, to: string, code: string) => Promise<void>,
): Promise<SendResult> {
  const cfg = mailSettings();
  const email = user.email!;
  const destination = maskEmail(email);
  const ref = otpRef(purpose, user.uid);
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const salt = randomBytes(16).toString('hex');
  const now = Date.now();

  const outcome = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.data() as OtpDoc | undefined;
    if (cur?.lockedUntil && cur.lockedUntil.toMillis() > now) {
      return { status: 'locked', retryAfterSeconds: secondsUntil(cur.lockedUntil, now) } as const;
    }
    if (cur?.lastSentAt && now - cur.lastSentAt.toMillis() < RESEND_COOLDOWN_S * 1000) {
      const left = Math.ceil((cur.lastSentAt.toMillis() + RESEND_COOLDOWN_S * 1000 - now) / 1000);
      return { status: 'cooldown', destination, retryAfterSeconds: left } as const;
    }
    const doc: OtpDoc = {
      uid: user.uid,
      purpose,
      codeHash: sha256(`${salt}:${code}`),
      salt,
      expiresAt: Timestamp.fromMillis(now + CODE_TTL_MS),
      attempts: 0,
      lockedUntil: null,
      lastSentAt: Timestamp.fromMillis(now),
    };
    tx.set(ref, doc);
    return null;
  });
  if (outcome) return outcome;

  try {
    await send(cfg, email, code);
  } catch (e) {
    console.error('Email send failed', e);
    await ref.delete().catch(() => undefined);
    throw new FnError('unavailable', 'We couldn’t send the email right now. Please try again.');
  }
  return { status: 'sent', destination, cooldownSeconds: RESEND_COOLDOWN_S };
}

async function checkCode(purpose: Purpose, uid: string, code: string): Promise<VerifyResult> {
  const ref = otpRef(purpose, uid);
  const now = Date.now();
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.data() as OtpDoc | undefined;
    if (!cur) return { status: 'expired' } as const;
    if (cur.lockedUntil && cur.lockedUntil.toMillis() > now) {
      return { status: 'locked', retryAfterSeconds: secondsUntil(cur.lockedUntil, now) } as const;
    }
    if (!cur.codeHash || !cur.salt || !cur.expiresAt || cur.expiresAt.toMillis() < now) {
      return { status: 'expired' } as const;
    }
    if (sha256(`${cur.salt}:${code}`) === cur.codeHash) {
      tx.delete(ref);
      return { status: 'ok' } as const;
    }
    const attempts = (cur.attempts ?? 0) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      tx.set(ref, { ...cur, attempts: 0, codeHash: null, salt: null, lockedUntil: Timestamp.fromMillis(now + LOCK_MS) });
      return { status: 'locked', retryAfterSeconds: LOCK_MS / 1000 } as const;
    }
    tx.update(ref, { attempts });
    return { status: 'incorrect', attemptsLeft: MAX_ATTEMPTS - attempts } as const;
  });
}

async function isSamePassword(email: string, password: string): Promise<boolean> {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.WEB_API_KEY || 'AIzaSyCnTcGSxKypGfyY5vPc99HPPwnZndDzkV0';
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

type Handler = (data: Record<string, unknown>, uid: string | null) => Promise<unknown>;

function requireAuth(uid: string | null) {
  if (!uid) throw new FnError('unauthenticated', 'Please sign in again.');
  return uid;
}

/** The same function names the mobile app already calls. */
export const handlers: Record<string, Handler> = {
  async isPhoneAvailable(data) {
    const phone = requireString(data, 'phone', 16);
    if (!isE164(phone)) throw new FnError('invalid-argument', 'Please enter a valid phone number.');
    try {
      await adminAuth().getUserByPhoneNumber(phone);
      return { available: false };
    } catch (e) {
      if ((e as { code?: string }).code === 'auth/user-not-found') return { available: true };
      throw e;
    }
  },

  async sendEmailVerificationCode(_data, uidOrNull) {
    const uid = requireAuth(uidOrNull);
    const user = await adminAuth().getUser(uid);
    if (!user.email) throw new FnError('failed-precondition', 'This account has no email address.');
    if (user.emailVerified) {
      await adminDb().doc(`users/${uid}`).set({ emailVerified: true }, { merge: true });
      return { status: 'already-verified' } satisfies SendResult;
    }
    return issueCode('verify_email', user, sendVerificationEmail);
  },

  async verifyEmailCode(data, uidOrNull) {
    const uid = requireAuth(uidOrNull);
    const code = requireCode(data);
    const result = await checkCode('verify_email', uid, code);
    if (result.status === 'ok') {
      await adminAuth().updateUser(uid, { emailVerified: true });
      await adminDb().doc(`users/${uid}`).set({ emailVerified: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    return result;
  },

  async sendPasswordResetCode(data) {
    const identifier = requireString(data, 'identifier');
    const user = await findUser(identifier);
    if (!user) throw new FnError('not-found', 'No account found with this email or phone number.');
    if (!user.email) throw new FnError('failed-precondition', 'This account has no email address. Use SMS instead.');
    if (user.disabled) throw new FnError('permission-denied', 'This account has been disabled.');
    return issueCode('reset_password', user, sendResetEmail);
  },

  async verifyPasswordResetCode(data) {
    const identifier = requireString(data, 'identifier');
    const code = requireCode(data);
    const user = await findUser(identifier);
    if (!user) return { status: 'expired' } satisfies VerifyResult;
    const result = await checkCode('reset_password', user.uid, code);
    if (result.status !== 'ok') return result;
    const resetToken = randomBytes(32).toString('hex');
    await adminDb()
      .collection('resetTokens')
      .doc(sha256(resetToken))
      .set({ uid: user.uid, expiresAt: Timestamp.fromMillis(Date.now() + RESET_TOKEN_TTL_MS) });
    return { status: 'ok', resetToken };
  },

  async resetPasswordWithToken(data) {
    const resetToken = requireString(data, 'resetToken', 128);
    const newPassword = data.newPassword;
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 4096) {
      throw new FnError('invalid-argument', 'Password must be at least 8 characters');
    }
    const ref = adminDb().collection('resetTokens').doc(sha256(resetToken));
    const snap = await ref.get();
    const tokenData = snap.data() as { uid: string; expiresAt: Timestamp } | undefined;
    if (!tokenData || tokenData.expiresAt.toMillis() < Date.now()) {
      await ref.delete().catch(() => undefined);
      return { status: 'expired' };
    }
    const user = await adminAuth().getUser(tokenData.uid);
    if (user.email && (await isSamePassword(user.email, newPassword))) return { status: 'same-password' };
    await adminAuth().updateUser(tokenData.uid, { password: newPassword });
    await adminAuth().revokeRefreshTokens(tokenData.uid);
    await ref.delete();
    return { status: 'ok' };
  },
};
