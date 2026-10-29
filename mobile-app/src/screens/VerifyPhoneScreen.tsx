import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import VerifyCodeView, { type ResendOutcome, type VerifyOutcome } from '../components/VerifyCodeView';
import { useAuth } from '../context/AuthContext';
import {
  clearPhoneAttempts,
  confirmLinkCode,
  phoneLockRemaining,
  registerWrongPhoneCode,
  sendLinkCode,
  type PhoneLinkSession,
} from '../services/phoneService';
import { markPhoneVerified } from '../services/userService';
import { signOut } from '../services/authService';
import { errorCode, friendlyError } from '../services/errors';
import { config } from '../config';
import { devOtpCode, isDevOtp } from '../services/devOtp';
import type { ScreenProps } from '../navigation/types';

/** Sign-up step 1: link and verify the phone number entered on Sign Up. */
export default function VerifyPhoneScreen({ navigation }: ScreenProps<'VerifyPhone'>) {
  const { user, profile, markDevVerified } = useAuth();
  const devMode = isDevOtp();
  const phone = profile?.phone ?? '';
  const session = useRef<PhoneLinkSession | null>(null);
  const [sending, setSending] = useState(true);
  const [autoCode, setAutoCode] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);

  const finish = useCallback(async () => {
    if (devMode) await markDevVerified('phone');
    else if (user) await markPhoneVerified(user.uid);
    await clearPhoneAttempts(phone);
    navigation.replace('VerifyEmail');
  }, [user, phone, navigation, devMode, markDevVerified]);

  const send = useCallback(
    async (forceResend: boolean) => {
      session.current = await sendLinkCode(phone, forceResend);
      if (session.current.autoCode) setAutoCode(session.current.autoCode);
    },
    [phone],
  );

  useEffect(() => {
    let cancelled = false;
    if (devMode) {
      setSending(false);
      return;
    }
    (async () => {
      // Already linked (e.g. app was closed right after verifying).
      if (user?.phoneNumber && user.phoneNumber === phone) {
        await finish();
        return;
      }
      const locked = await phoneLockRemaining(phone);
      if (locked > 0) {
        if (!cancelled) {
          setLockSeconds(locked);
          setSending(false);
        }
        return;
      }
      try {
        await send(false);
      } catch (e) {
        Alert.alert('Couldn’t send code', friendlyError(e));
      } finally {
        if (!cancelled) setSending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const onVerify = useCallback(
    async (code: string): Promise<VerifyOutcome> => {
      if (devMode) {
        if (code === devOtpCode()) {
          await finish();
          return { status: 'ok' };
        }
        const r = await registerWrongPhoneCode(phone);
        return r.locked ? { status: 'locked', retryAfterSeconds: r.retryAfterSeconds } : { status: 'incorrect' };
      }
      if (!session.current) return { status: 'expired' };
      try {
        await confirmLinkCode(session.current, code);
        await finish();
        return { status: 'ok' };
      } catch (e) {
        const c = errorCode(e);
        if (c === 'auth/invalid-verification-code') {
          const r = await registerWrongPhoneCode(phone);
          return r.locked ? { status: 'locked', retryAfterSeconds: r.retryAfterSeconds } : { status: 'incorrect' };
        }
        if (c === 'auth/session-expired' || c === 'auth/code-expired') return { status: 'expired' };
        if (c === 'auth/provider-already-linked') {
          await finish();
          return { status: 'ok' };
        }
        if (c === 'auth/too-many-requests') return { status: 'locked', retryAfterSeconds: config.lockoutMinutes * 60 };
        return { status: 'error', message: friendlyError(e) };
      }
    },
    [phone, finish, devMode],
  );

  const onResend = useCallback(async (): Promise<ResendOutcome> => {
    if (devMode) return { status: 'sent' };
    try {
      await send(true);
      return { status: 'sent' };
    } catch (e) {
      return { status: 'error', message: friendlyError(e) };
    }
  }, [send, devMode]);

  const onBack = () =>
    Alert.alert('Leave verification?', 'You can sign in later to finish verifying your account.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <VerifyCodeView
      title="Verify Your Phone Number"
      message={
        devMode
          ? `Test mode: no SMS is sent. Enter ${devOtpCode()} to verify ${phone}.`
          : `We’ve sent a 6-digit verification code to your registered phone number (${phone}).`
      }
      onVerify={onVerify}
      onResend={onResend}
      sending={sending}
      autoCode={autoCode}
      initialLockSeconds={lockSeconds}
      onBack={onBack}
    />
  );
}
