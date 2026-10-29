/**
 * Cloud Functions for the auth module.
 *
 * Firebase Auth handles email/password and SMS codes natively. What it can't do is send a
 * 6-digit code by EMAIL, which the design needs for "Verify Your Email Address" and for
 * "Forgot Password → Via Email". These callables implement that:
 *
 *   isPhoneAvailable           – sign-up / forgot-password pre-check
 *   sendEmailVerificationCode  – (signed in) email a code to the account's address
 *   verifyEmailCode            – (signed in) mark the email verified
 *   sendPasswordResetCode      – email a reset code (identifier = email or E.164 phone)
 *   verifyPasswordResetCode    – exchange a correct code for a short-lived reset token
 *   resetPasswordWithToken     – set the new password
 *
 * Codes are stored hashed in otp/{purpose}_{uid}, expire after 10 minutes, can be resent
 * every 30 seconds, and lock for 30 minutes after 5 wrong attempts.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { sendResetEmail, sendVerificationEmail, type MailConfig } from './email';

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

// ---- Configuration (firebase functions:secrets:set SMTP_PASS, the rest in functions/.env) ----
const SMTP_PASS = defineSecret('SMTP_PASS');
const SMTP_HOST = defineString('SMTP_HOST', { default: 'smtp.gmail.com' });
const SMTP_PORT = defineString('SMTP_PORT', { default: '465' });
const SMTP_USER = defineString('SMTP_USER');
const MAIL_FROM = defineString('MAIL_FROM');
const APP_NAME = defineString('APP_NAME', { default: 'KD Ascend' });
/** Optional: Web API key (Project settings → General). Enables the "must differ from previous password" check on email resets. */
const WEB_API_KEY = defineString('WEB_API_KEY', { default: '' });
/** Set to true once Firebase App Check is added to the app, to block scripted abuse of these endpoints. */
const ENFORCE_APP_CHECK = false;

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

const callOpts = () => ({ enforceAppCheck: ENFORCE_APP_CHECK });
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const secondsUntil = (t: Timestamp, now: number) => Math.max(1, Math.ceil((t.toMillis() - now) / 1000));
const otpRef = (purpose: Purpose, uid: string) => db.collection('otp').doc(`${purpose}_${uid}`);

function mailConfig(): MailConfig {
  return {
    host: SMTP_HOST.value(),
    port: Number(SMTP_PORT.value()) || 465,
    user: SMTP_USER.value(),
    pass: SMTP_PASS.value(),
    from: MAIL_FROM.value() || SMTP_USER.value(),
    appName: APP_NAME.value(),
  };
}

export function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function requireString(data: unknown, key: string, max = 320): string {
  const value = (data as Record<string, unknown> | undefined)?.[key];
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new HttpsError('invalid-argument', `Missing or invalid "${key}".`);
  }
  return value.trim();
}

const isE164 = (v: string) => /^\+[1-9]\d{7,14}$/.test(v);

async function findUser(identifier: string): Promise<UserRecord | null> {
  try {
    if (identifier.includes('@')) return await getAuth().getUserByEmail(identifier.toLowerCase());
    if (!isE164(identifier)) throw new HttpsError('invalid-argument', 'Please enter a valid email address or phone number.');
    return await getAuth().getUserByPhoneNumber(identifier);
  } catch (e) {
    if ((e as { code?: string }).code === 'auth/user-not-found') return null;
    throw e;
  }
}

/** Creates (or refreshes) a code and emails it. */
async function issueCode(
  purpose: Purpose,
  user: UserRecord,
  send: (cfg: MailConfig, to: string, code: string) => Promise<void>,
): Promise<SendResult> {
  const email = user.email!;
  const destination = maskEmail(email);
  const ref = otpRef(purpose, user.uid);
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const salt = randomBytes(16).toString('hex');
  const now = Date.now();

  const outcome = await db.runTransaction(async (tx) => {
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
    await send(mailConfig(), email, code);
  } catch (e) {
    console.error('Email send failed', e);
    await ref.delete().catch(() => undefined);
    throw new HttpsError('unavailable', 'We couldn’t send the email right now. Please try again.');
  }
  return { status: 'sent', destination, cooldownSeconds: RESEND_COOLDOWN_S };
}

/** Checks a code; deletes it on success, counts failures, locks after MAX_ATTEMPTS. */
async function checkCode(purpose: Purpose, uid: string, code: string): Promise<VerifyResult> {
  const ref = otpRef(purpose, uid);
  const now = Date.now();
  return db.runTransaction(async (tx) => {
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

function requireCode(data: unknown) {
  const code = requireString(data, 'code', 6);
  if (!/^\d{6}$/.test(code)) throw new HttpsError('invalid-argument', 'The code must be 6 digits.');
  return code;
}

function requireAuth(req: CallableRequest) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Please sign in again.');
  return req.auth.uid;
}

// ---------------------------------------------------------------------------

export const isPhoneAvailable = onCall(callOpts(), async (req) => {
  const phone = requireString(req.data, 'phone', 16);
  if (!isE164(phone)) throw new HttpsError('invalid-argument', 'Please enter a valid phone number.');
  try {
    await getAuth().getUserByPhoneNumber(phone);
    return { available: false };
  } catch (e) {
    if ((e as { code?: string }).code === 'auth/user-not-found') return { available: true };
    throw e;
  }
});

export const sendEmailVerificationCode = onCall({ ...callOpts(), secrets: [SMTP_PASS] }, async (req) => {
  const uid = requireAuth(req);
  const user = await getAuth().getUser(uid);
  if (!user.email) throw new HttpsError('failed-precondition', 'This account has no email address.');
  if (user.emailVerified) {
    await db.doc(`users/${uid}`).set({ emailVerified: true }, { merge: true });
    return { status: 'already-verified' } satisfies SendResult;
  }
  return issueCode('verify_email', user, sendVerificationEmail);
});

export const verifyEmailCode = onCall(callOpts(), async (req) => {
  const uid = requireAuth(req);
  const code = requireCode(req.data);
  const result = await checkCode('verify_email', uid, code);
  if (result.status === 'ok') {
    await getAuth().updateUser(uid, { emailVerified: true });
    await db.doc(`users/${uid}`).set({ emailVerified: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  return result;
});

export const sendPasswordResetCode = onCall({ ...callOpts(), secrets: [SMTP_PASS] }, async (req) => {
  const identifier = requireString(req.data, 'identifier');
  const user = await findUser(identifier);
  if (!user) throw new HttpsError('not-found', 'No account found with this email or phone number.');
  if (!user.email) throw new HttpsError('failed-precondition', 'This account has no email address. Use SMS instead.');
  if (user.disabled) throw new HttpsError('permission-denied', 'This account has been disabled.');
  return issueCode('reset_password', user, sendResetEmail);
});

export const verifyPasswordResetCode = onCall(callOpts(), async (req) => {
  const identifier = requireString(req.data, 'identifier');
  const code = requireCode(req.data);
  const user = await findUser(identifier);
  if (!user) return { status: 'expired' } satisfies VerifyResult;

  const result = await checkCode('reset_password', user.uid, code);
  if (result.status !== 'ok') return result;

  const resetToken = randomBytes(32).toString('hex');
  await db
    .collection('resetTokens')
    .doc(sha256(resetToken))
    .set({ uid: user.uid, expiresAt: Timestamp.fromMillis(Date.now() + RESET_TOKEN_TTL_MS) });
  return { status: 'ok', resetToken };
});

async function isSamePassword(email: string, password: string): Promise<boolean> {
  const key = WEB_API_KEY.value();
  if (!key) return false;
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

export const resetPasswordWithToken = onCall(callOpts(), async (req) => {
  const resetToken = requireString(req.data, 'resetToken', 128);
  const newPassword = (req.data as { newPassword?: unknown })?.newPassword;
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 4096) {
    throw new HttpsError('invalid-argument', 'Password must be at least 8 characters');
  }

  const ref = db.collection('resetTokens').doc(sha256(resetToken));
  const snap = await ref.get();
  const data = snap.data() as { uid: string; expiresAt: Timestamp } | undefined;
  if (!data || data.expiresAt.toMillis() < Date.now()) {
    await ref.delete().catch(() => undefined);
    return { status: 'expired' };
  }

  const user = await getAuth().getUser(data.uid);
  if (user.email && (await isSamePassword(user.email, newPassword))) {
    return { status: 'same-password' };
  }

  await getAuth().updateUser(data.uid, { password: newPassword });
  await getAuth().revokeRefreshTokens(data.uid); // sign out other devices
  await ref.delete();
  return { status: 'ok' };
});
