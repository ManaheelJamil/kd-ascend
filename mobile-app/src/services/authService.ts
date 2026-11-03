import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from '@react-native-firebase/auth';
import { auth, callFunction } from '../firebase';
import { createUserDoc } from './userService';
import { errorCode, isFunctionMissing } from './errors';

const REMEMBER_KEY = 'auth.rememberMe';
const REMEMBERED_EMAIL_KEY = 'auth.rememberedEmail';

/**
 * "Remember me"
 *  - ticked: the user stays signed in when the app is closed and reopened, and after logging out
 *    the Sign in screen opens with their email filled in and the box ticked.
 *  - not ticked: the session ends the next time the app is opened, and the email is forgotten.
 * The password is never stored on the phone.
 */
export const setRememberMe = (remember: boolean) => AsyncStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
export const getRememberMe = async () => (await AsyncStorage.getItem(REMEMBER_KEY)) !== '0';

/** Email saved by "Remember me" (null when the box was not ticked last time). */
export async function getRememberedEmail(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
  } catch {
    return null;
  }
}

export async function login(email: string, password: string, remember: boolean) {
  const cleanEmail = email.trim().toLowerCase();
  const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
  // Saved only after a successful sign-in.
  await setRememberMe(remember);
  if (remember) await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, cleanEmail);
  else await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
  return cred;
}

/**
 * true = free, false = already used by another account, null = couldn't check
 * (functions not deployed yet / offline). Callers treat null as "carry on":
 * Firebase still refuses to link a number that belongs to another account.
 */
export async function isPhoneAvailable(phoneE164: string): Promise<boolean | null> {
  try {
    const res = await callFunction<{ available: boolean }>('isPhoneAvailable', { phone: phoneE164 });
    return res.available;
  } catch (e) {
    const code = errorCode(e);
    if (isFunctionMissing(e) || ['internal', 'unavailable', 'deadline-exceeded'].includes(code)) {
      if (__DEV__) console.warn('[isPhoneAvailable] skipped:', code);
      return null;
    }
    throw e;
  }
}

/** Creates the Firebase account and its Firestore profile. Phone/email are verified next. */
export async function register(email: string, phoneE164: string, password: string) {
  await setRememberMe(true);
  const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await createUserDoc(cred.user.uid, cred.user.email ?? email.trim().toLowerCase(), phoneE164);
  return cred.user;
}

export const signOut = () => fbSignOut(auth);

/** True when `password` is the account's current password (used to enforce "must be different"). */
export async function isCurrentPassword(password: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user?.email) return false;
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    return true;
  } catch (e) {
    const code = errorCode(e);
    if (code === 'auth/too-many-requests' || code === 'auth/network-request-failed') throw e;
    return false;
  }
}

export const changePassword = (password: string) => {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('Not signed in'), { code: 'unauthenticated' });
  return updatePassword(user, password);
};
