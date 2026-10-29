import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import VerifyCodeView, { type ResendOutcome, type VerifyOutcome } from '../components/VerifyCodeView';
import { useAuth } from '../context/AuthContext';
import { sendEmailVerificationCode, verifyEmailCode, type SendResult } from '../services/otpService';
import { signOut } from '../services/authService';
import { friendlyError } from '../services/errors';
import { config } from '../config';
import { devOtpCode, isDevEmailOtp } from '../services/devOtp';
import type { ScreenProps } from '../navigation/types';

/** Sign-up step 2: 6-digit code emailed by the sendEmailVerificationCode function. */
export default function VerifyEmailScreen({ navigation }: ScreenProps<'VerifyEmail'>) {
  const { user, profile, markDevVerified } = useAuth();
  const devMode = isDevEmailOtp();
  const [sending, setSending] = useState(true);
  const [cooldown, setCooldown] = useState<number>(config.resendCooldownSeconds);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [destination, setDestination] = useState(user?.email ?? profile?.email ?? '');

  const next = useCallback(() => navigation.replace('PersonalInfo'), [navigation]);

  const apply = useCallback(
    (res: SendResult): ResendOutcome => {
      if (res.status === 'already-verified') {
        next();
        return { status: 'sent' };
      }
      if (res.status === 'locked') {
        setLockSeconds(res.retryAfterSeconds);
        return res;
      }
      setDestination(res.destination);
      if (res.status === 'cooldown') {
        setCooldown(res.retryAfterSeconds);
        return res;
      }
      setCooldown(res.cooldownSeconds);
      return { status: 'sent', cooldownSeconds: res.cooldownSeconds };
    },
    [next],
  );

  useEffect(() => {
    if (profile?.emailVerified) {
      next();
      return;
    }
    let cancelled = false;
    if (devMode) {
      setSending(false);
      return;
    }
    sendEmailVerificationCode()
      .then((res) => !cancelled && apply(res))
      .catch((e) => Alert.alert('Couldn’t send code', friendlyError(e)))
      .finally(() => !cancelled && setSending(false));
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onVerify = useCallback(
    async (code: string): Promise<VerifyOutcome> => {
      if (devMode) {
        if (code !== devOtpCode()) return { status: 'incorrect' };
        await markDevVerified('email');
        next();
        return { status: 'ok' };
      }
      try {
        const res = await verifyEmailCode(code);
        if (res.status === 'ok') {
          next();
          return { status: 'ok' };
        }
        return res;
      } catch (e) {
        return { status: 'error', message: friendlyError(e) };
      }
    },
    [next, devMode, markDevVerified],
  );

  const onResend = useCallback(async (): Promise<ResendOutcome> => {
    if (devMode) return { status: 'sent' };
    try {
      return apply(await sendEmailVerificationCode());
    } catch (e) {
      return { status: 'error', message: friendlyError(e) };
    }
  }, [apply, devMode]);

  const onBack = () =>
    Alert.alert('Leave verification?', 'You can sign in later to finish verifying your account.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <VerifyCodeView
      key={sending ? 'sending' : 'ready'}
      title="Verify Your Email Address"
      message={
        devMode
          ? `Test mode: no email is sent. Enter ${devOtpCode()} to verify ${destination}.`
          : `We’ve sent a 6-digit verification code to (${destination})`
      }
      onVerify={onVerify}
      onResend={onResend}
      sending={sending}
      initialCooldown={cooldown}
      initialLockSeconds={lockSeconds}
      onBack={onBack}
    />
  );
}
