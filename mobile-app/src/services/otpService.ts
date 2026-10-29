/**
 * 6-digit codes sent by email. Firebase Auth has no email OTP, so these go through
 * the Cloud Functions in functions/src/index.ts (codes are hashed, expire in 10 minutes,
 * and lock for 30 minutes after 5 wrong attempts — enforced on the server).
 */
import { callFunction } from '../firebase';

export type SendResult =
  | { status: 'sent'; destination: string; cooldownSeconds: number }
  | { status: 'cooldown'; destination: string; retryAfterSeconds: number }
  | { status: 'locked'; retryAfterSeconds: number }
  | { status: 'already-verified' };

export type VerifyResult<T = object> =
  | ({ status: 'ok' } & T)
  | { status: 'incorrect'; attemptsLeft: number }
  | { status: 'locked'; retryAfterSeconds: number }
  | { status: 'expired' };

export type ResetResult = { status: 'ok' } | { status: 'same-password' } | { status: 'expired' };

export const sendEmailVerificationCode = () => callFunction<SendResult>('sendEmailVerificationCode');

export const verifyEmailCode = (code: string) => callFunction<VerifyResult>('verifyEmailCode', { code });

/** identifier = email, or phone in E.164. The code always goes to the account's email. */
export const sendPasswordResetCode = (identifier: string) =>
  callFunction<SendResult>('sendPasswordResetCode', { identifier });

/** Forgot password by email: sends the "Password Reset Request" email with a reset link (valid 24 hours). */
export const sendPasswordResetLink = (identifier: string) =>
  callFunction<Exclude<SendResult, { status: 'already-verified' } | { status: 'locked'; retryAfterSeconds: number }>>(
    'sendPasswordResetLink',
    { identifier },
  );

export const verifyPasswordResetCode = (identifier: string, code: string) =>
  callFunction<VerifyResult<{ resetToken: string }>>('verifyPasswordResetCode', { identifier, code });

export const resetPasswordWithToken = (resetToken: string, newPassword: string) =>
  callFunction<ResetResult>('resetPasswordWithToken', { resetToken, newPassword });

/** Sends the "password changed" email after an SMS reset (best effort, never throws). */
export const notifyPasswordChanged = () =>
  callFunction<{ sent: boolean }>('notifyPasswordChanged', {}).catch(() => ({ sent: false }));

/**
 * TEST MODE (config.devOtpCode set): "Forgot Password → Via SMS" with a fixed code.
 * Nothing is sent; the server accepts its TEST_SMS_OTP code and returns a reset token.
 */
export const sendTestSmsResetCode = (phone: string) => callFunction<SendResult>('sendTestSmsResetCode', { phone });

export const verifyTestSmsResetCode = (phone: string, code: string) =>
  callFunction<VerifyResult<{ resetToken: string }>>('verifyTestSmsResetCode', { phone, code });
