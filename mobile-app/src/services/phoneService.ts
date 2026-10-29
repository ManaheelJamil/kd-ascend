/**
 * SMS codes use Firebase Phone Auth.
 *  - Sign-up: the phone is LINKED to the email account (verifyPhoneNumber + linkWithCredential).
 *  - Forgot password: signing in with the phone opens the same linked account, so the
 *    password can then be changed with updatePassword.
 * Firebase throttles abuse itself; on top of that we count wrong codes per number on the
 * device so the UI can show the 30-minute lockout from the design.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  verifyPhoneNumber,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  getAdditionalUserInfo,
  deleteUser,
  getIdToken,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import { auth } from '../firebase';
import { config } from '../config';

type LockState = { attempts: number; lockedUntil: number | null };
const lockKey = (phone: string) => `otp.phone.${phone}`;

async function readLock(phone: string): Promise<LockState> {
  try {
    const raw = await AsyncStorage.getItem(lockKey(phone));
    return raw ? (JSON.parse(raw) as LockState) : { attempts: 0, lockedUntil: null };
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

/** Seconds left on a lockout, or 0. */
export async function phoneLockRemaining(phone: string): Promise<number> {
  const s = await readLock(phone);
  if (!s.lockedUntil) return 0;
  const left = Math.ceil((s.lockedUntil - Date.now()) / 1000);
  if (left <= 0) {
    await AsyncStorage.removeItem(lockKey(phone));
    return 0;
  }
  return left;
}

export async function registerWrongPhoneCode(
  phone: string,
): Promise<{ locked: true; retryAfterSeconds: number } | { locked: false; attemptsLeft: number }> {
  const s = await readLock(phone);
  const attempts = s.attempts + 1;
  if (attempts >= config.maxCodeAttempts) {
    const lockedUntil = Date.now() + config.lockoutMinutes * 60_000;
    await AsyncStorage.setItem(lockKey(phone), JSON.stringify({ attempts: 0, lockedUntil }));
    return { locked: true, retryAfterSeconds: config.lockoutMinutes * 60 };
  }
  await AsyncStorage.setItem(lockKey(phone), JSON.stringify({ attempts, lockedUntil: null }));
  return { locked: false, attemptsLeft: config.maxCodeAttempts - attempts };
}

export const clearPhoneAttempts = (phone: string) => AsyncStorage.removeItem(lockKey(phone));

/**
 * Firebase sometimes never answers (e.g. SMS not enabled on the project, no Play services),
 * which would leave the screen loading forever. Give up after 45 seconds with a clear error.
 */
const SEND_TIMEOUT_MS = 45_000;
function withTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(Object.assign(new Error('SMS timeout'), { code: 'auth/sms-timeout' })),
      SEND_TIMEOUT_MS,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/* ---------- Sign-up: link phone to the signed-in account ---------- */

export type PhoneLinkSession = { verificationId: string; autoCode?: string | null };

export async function sendLinkCode(phone: string, forceResend = false): Promise<PhoneLinkSession> {
  // Resolves when the SMS is sent (or Android auto-verifies the number).
  const snapshot = await withTimeout(Promise.resolve(verifyPhoneNumber(auth, phone, forceResend)));
  return { verificationId: snapshot.verificationId, autoCode: snapshot.code ?? null };
}

export async function confirmLinkCode(session: PhoneLinkSession, code: string) {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('Not signed in'), { code: 'unauthenticated' });
  const credential = PhoneAuthProvider.credential(session.verificationId, code);
  await linkWithCredential(user, credential);
  // Refresh so Firestore rules see phone_number in the token.
  await getIdToken(user, true);
}

/* ---------- Forgot password: sign in with the phone ---------- */

let pendingConfirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

export async function sendSignInCode(phone: string) {
  pendingConfirmation = await withTimeout(signInWithPhoneNumber(auth, phone));
}

/** Returns false if the number isn't linked to any account (the throwaway user is removed). */
export async function confirmSignInCode(code: string): Promise<boolean> {
  if (!pendingConfirmation) {
    throw Object.assign(new Error('No code requested'), { code: 'auth/session-expired' });
  }
  const cred = await pendingConfirmation.confirm(code);
  if (!cred) throw Object.assign(new Error('No credential'), { code: 'auth/invalid-verification-code' });
  pendingConfirmation = null;
  const info = getAdditionalUserInfo(cred);
  if (info?.isNewUser || !cred.user.email) {
    await deleteUser(cred.user).catch(() => undefined);
    return false;
  }
  return true;
}
