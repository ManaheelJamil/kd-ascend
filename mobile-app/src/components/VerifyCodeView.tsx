import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { config } from '../config';
import { minutesFromSeconds } from '../utils/format';
import AuthLayout from './AuthLayout';
import TitleBlock from './TitleBlock';
import OtpInput, { type OtpInputHandle } from './OtpInput';
import Button from './Button';

export type VerifyOutcome =
  | { status: 'ok' }
  | { status: 'incorrect' }
  | { status: 'locked'; retryAfterSeconds: number }
  | { status: 'expired' }
  | { status: 'error'; message: string };

export type ResendOutcome =
  | { status: 'sent'; cooldownSeconds?: number }
  | { status: 'cooldown'; retryAfterSeconds: number }
  | { status: 'locked'; retryAfterSeconds: number }
  | { status: 'error'; message: string };

type Props = {
  title: string;
  message: string;
  onVerify: (code: string) => Promise<VerifyOutcome>;
  onResend: () => Promise<ResendOutcome>;
  /** Seconds before "Resend Code" is available on first render. */
  initialCooldown?: number;
  /** Seconds left on a lockout when the screen opens. */
  initialLockSeconds?: number;
  /** While the first code is being sent the boxes are disabled. */
  sending?: boolean;
  /** Fills and submits automatically (Android SMS auto-retrieval). */
  autoCode?: string | null;
  onBack?: () => void;
};

type Phase = 'idle' | 'incorrect' | 'locked' | 'expired';

/**
 * The "Verify Your Phone Number / Email Address / Identity" screens, including the
 * "Incorrect Code" and "try again after 30 minutes" states from the design.
 */
export default function VerifyCodeView({
  title,
  message,
  onVerify,
  onResend,
  initialCooldown = config.resendCooldownSeconds,
  initialLockSeconds = 0,
  sending,
  autoCode,
  onBack,
}: Props) {
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<Phase>(initialLockSeconds > 0 ? 'locked' : 'idle');
  const [lockLeft, setLockLeft] = useState(initialLockSeconds);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const otpRef = useRef<OtpInputHandle>(null);

  useEffect(() => {
    if (initialLockSeconds > 0) {
      setPhase('locked');
      setLockLeft(initialLockSeconds);
    }
  }, [initialLockSeconds]);

  // One ticking clock for both the resend countdown and the lockout.
  useEffect(() => {
    const t = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
      setLockLeft((l) => {
        if (l <= 1 && l > 0) {
          setPhase('idle');
          return 0;
        }
        return l > 0 ? l - 1 : 0;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const submit = useCallback(
    async (value: string) => {
      if (busy || phase === 'locked' || value.length !== config.otpLength) return;
      setBusy(true);
      setNotice(null);
      try {
        const res = await onVerify(value);
        if (res.status === 'incorrect') setPhase('incorrect');
        else if (res.status === 'expired') setPhase('expired');
        else if (res.status === 'locked') {
          setPhase('locked');
          setLockLeft(res.retryAfterSeconds);
        } else if (res.status === 'error') setNotice(res.message);
      } finally {
        setBusy(false);
      }
    },
    [busy, phase, onVerify],
  );

  useEffect(() => {
    if (autoCode && autoCode.length === config.otpLength) {
      setCode(autoCode);
      submit(autoCode);
    }
  }, [autoCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const resend = async () => {
    if (cooldown > 0 || resending || phase === 'locked') return;
    setResending(true);
    setNotice(null);
    try {
      const res = await onResend();
      if (res.status === 'sent') {
        setCooldown(res.cooldownSeconds ?? config.resendCooldownSeconds);
        setCode('');
        setPhase('idle');
        setNotice('A new code has been sent.');
        otpRef.current?.focus();
      } else if (res.status === 'cooldown') setCooldown(res.retryAfterSeconds);
      else if (res.status === 'locked') {
        setPhase('locked');
        setLockLeft(res.retryAfterSeconds);
      } else setNotice(res.message);
    } finally {
      setResending(false);
    }
  };

  const onButton = () => {
    if (phase === 'incorrect') {
      setCode('');
      setPhase('idle');
      otpRef.current?.focus();
      return;
    }
    if (phase === 'locked') return;
    submit(code);
  };

  const errorState = phase === 'incorrect' || phase === 'locked';
  const buttonLabel = phase === 'idle' || phase === 'expired' ? 'Verify' : 'Try Again';

  return (
    <AuthLayout
      onBack={onBack}
      footer={
        <Button
          title={buttonLabel}
          onPress={onButton}
          loading={busy}
          disabled={
            sending || phase === 'locked' || ((phase === 'idle' || phase === 'expired') && code.length !== config.otpLength)
          }
        />
      }
    >
      <TitleBlock title={title} subtitle={message} />

      <View style={styles.otp}>
        <OtpInput
          ref={otpRef}
          value={code}
          onChange={(v) => {
            setCode(v);
            if (phase === 'incorrect' || phase === 'expired') setPhase('idle');
          }}
          onComplete={submit}
          error={errorState}
          disabled={sending || phase === 'locked' || busy}
        />
      </View>

      <View style={styles.helper}>
        {sending ? (
          <ActivityIndicator color={colors.main} />
        ) : phase === 'incorrect' ? (
          <Text style={[styles.helperText, styles.errorText]}>Incorrect Code. Please Try Again</Text>
        ) : phase === 'locked' ? (
          <Text style={[styles.helperText, styles.errorText]}>
            You’ve entered the wrong code multiple times. Please try again after{' '}
            {minutesFromSeconds(lockLeft)} minutes.
          </Text>
        ) : (
          <Text style={styles.helperText}>
            {phase === 'expired' ? (
              <Text style={styles.errorText}>This code has expired. </Text>
            ) : (
              <Text style={styles.grey}>
                Didn’t receive the code?
                {cooldown > 0 ? ` You can request a new one in ${cooldown} seconds.` : ''}
              </Text>
            )}{' '}
            <Text
              onPress={resend}
              disabled={cooldown > 0 || resending}
              style={[styles.resend, (cooldown > 0 || resending) && styles.resendDisabled]}
              accessibilityRole="button"
            >
              Resend Code
            </Text>
          </Text>
        )}
        {notice ? <Text style={[styles.helperText, styles.grey, { marginTop: 8 }]}>{notice}</Text> : null}
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  otp: { marginTop: 34 },
  helper: { marginTop: 21, alignItems: 'center', alignSelf: 'center', maxWidth: 274 },
  helperText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', color: colors.black },
  grey: { color: colors.grey },
  errorText: { fontFamily: fonts.medium, color: colors.error },
  resend: { fontFamily: fonts.semibold, color: colors.main, textDecorationLine: 'underline' },
  resendDisabled: { opacity: 0.45 },
});
