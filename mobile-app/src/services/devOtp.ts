/**
 * TEST OTP MODE — for testing builds (development AND shared APKs).
 *
 * While `config.devOtpCode` is set, the phone and email verification screens send
 * nothing and accept that fixed code. ⚠️ Set it to null before publishing the app.
 * The result is saved in Firestore as `users/{uid}.testVerification` (separate from the
 * real `phoneVerified` / `emailVerified`, which only Firebase itself can set), so the
 * security rules stay strict.
 *
 * To turn it off: set `devOtpCode: null` in src/config.ts.
 */
import { updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { config } from '../config';
import { userRef } from './userService';

export type DevFlags = { phone: boolean; email: boolean };

export const isDevOtp = (): boolean => !!config.devOtpCode;
/** Email step in test mode? Only when devOtpCode is set AND devEmailOtp is true. */
export const isDevEmailOtp = (): boolean => !!config.devOtpCode && config.devEmailOtp;
export const devOtpCode = (): string => config.devOtpCode ?? '';
export const isDevPrefill = (): boolean => config.devPrefill;

export function writeDevFlag(uid: string, kind: keyof DevFlags) {
  return updateDoc(userRef(uid), {
    [`testVerification.${kind}`]: true,
    [`testVerification.${kind}At`]: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
