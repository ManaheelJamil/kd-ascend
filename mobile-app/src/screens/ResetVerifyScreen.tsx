import React, { useCallback, useEffect, useState } from 'react';
import VerifyCodeView, { type ResendOutcome, type VerifyOutcome } from '../components/VerifyCodeView';
import { useAuth } from '../context/AuthContext';
import {
  clearPhoneAttempts,
  confirmSignInCode,
  phoneLockRemaining,
  registerWrongPhoneCode,
  sendSignInCode,
} from '../services/phoneService';
import {
  sendPasswordResetCode,
  sendTestSmsResetCode,
  verifyPasswordResetCode,
  verifyTestSmsResetCode,
} from '../services/otpService';
import { devOtpCode, isDevOtp } from '../services/devOtp';
import { signOut } from '../services/authService';
import { errorCode, friendlyError } from '../services/errors';
import { config } from '../config';
import type { ScreenProps } from '../navigation/types';

/** "Verify Your Identity" step of the forgot-password flow (SMS or email code). */
export default function ResetVerifyScreen({ navigation, route }: ScreenProps<'ResetVerify'>) {
  const params = route.params;
  const { lockRouting, unlockRouting } = useAuth();
  const [lockSeconds, setLockSeconds] = useState(params.channel === 'email' ? params.lockedSeconds ?? 0 : 0);

  useEffect(() => {
    if (params.channel === 'sms') phoneLockRemaining(params.phone).then(setLockSeconds);
  }, [params]);

  const message =
    params.channel === 'sms' && isDevOtp()
      ? `Test mode: no SMS is sent. Enter ${devOtpCode()} to reset the password for ${params.phone}.`
      : params.channel === 'sms'
      ? `We’ve sent a 6-digit verification code to your registered phone number (${params.phone}).`
      : `We’ve sent a 6-digit verification code to (${params.destination})`;

  const onVerify = useCallback(
    async (code: string): Promise<VerifyOutcome> => {
      if (params.channel === 'email') {
        try {
          const res = await verifyPasswordResetCode(params.identifier, code);
          if (res.status === 'ok') {
            navigation.replace('CreateNewPassword', { mode: 'email', resetToken: res.resetToken });
            return { status: 'ok' };
          }
          return res;
        } catch (e) {
          return { status: 'error', message: friendlyError(e) };
        }
      }

      // SMS in test mode: the server checks the fixed code and returns a reset token.
      if (isDevOtp()) {
        try {
          const res = await verifyTestSmsResetCode(params.phone, code);
          if (res.status === 'ok') {
            navigation.replace('CreateNewPassword', { mode: 'email', resetToken: res.resetToken });
            return { status: 'ok' };
          }
          return res;
        } catch (e) {
          return { status: 'error', message: friendlyError(e) };
        }
      }

      // SMS: confirming signs in to the linked account. Keep the auth screens on screen.
      lockRouting();
      try {
        const found = await confirmSignInCode(code);
        await clearPhoneAttempts(params.phone);
        if (!found) {
          unlockRouting();
          return { status: 'error', message: 'No account found with this phone number.' };
        }
        navigation.replace('CreateNewPassword', { mode: 'sms' });
        return { status: 'ok' };
      } catch (e) {
        const code_ = errorCode(e);
        await signOut().catch(() => undefined);
        unlockRouting();
        if (code_ === 'auth/invalid-verification-code') {
          const r = await registerWrongPhoneCode(params.phone);
          return r.locked ? { status: 'locked', retryAfterSeconds: r.retryAfterSeconds } : { status: 'incorrect' };
        }
        if (code_ === 'auth/session-expired' || code_ === 'auth/code-expired') return { status: 'expired' };
        if (code_ === 'auth/too-many-requests') {
          return { status: 'locked', retryAfterSeconds: config.lockoutMinutes * 60 };
        }
        return { status: 'error', message: friendlyError(e) };
      }
    },
    [params, navigation, lockRouting, unlockRouting],
  );

  const onResend = useCallback(async (): Promise<ResendOutcome> => {
    try {
      if (params.channel === 'email') {
        const res = await sendPasswordResetCode(params.identifier);
        if (res.status === 'sent') return { status: 'sent', cooldownSeconds: res.cooldownSeconds };
        if (res.status === 'cooldown' || res.status === 'locked') return res;
        return { status: 'sent' };
      }
      if (isDevOtp()) {
        const res = await sendTestSmsResetCode(params.phone);
        if (res.status === 'sent') return { status: 'sent', cooldownSeconds: res.cooldownSeconds };
        if (res.status === 'cooldown' || res.status === 'locked') return res;
        return { status: 'sent' };
      }
      await sendSignInCode(params.phone);
      return { status: 'sent' };
    } catch (e) {
      return { status: 'error', message: friendlyError(e) };
    }
  }, [params]);

  return (
    <VerifyCodeView
      title="Verify Your Identity"
      message={message}
      onVerify={onVerify}
      onResend={onResend}
      initialCooldown={params.channel === 'email' ? params.cooldownSeconds ?? config.resendCooldownSeconds : undefined}
      initialLockSeconds={lockSeconds}
    />
  );
}
