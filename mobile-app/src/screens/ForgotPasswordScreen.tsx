import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import TitleBlock from '../components/TitleBlock';
import TextField from '../components/TextField';
import Button from '../components/Button';
import ChannelModal, { type Channel } from '../components/ChannelModal';
import { isEmail, toE164 } from '../utils/validation';
import { sendPasswordResetCode, sendTestSmsResetCode } from '../services/otpService';
import { isDevOtp } from '../services/devOtp';
import { isPhoneAvailable } from '../services/authService';
import { phoneLockRemaining, sendSignInCode } from '../services/phoneService';
import { errorCode, friendlyError, isFunctionMissing } from '../services/errors';
import { minutesFromSeconds } from '../utils/format';
import type { ScreenProps } from '../navigation/types';

export default function ForgotPasswordScreen({ navigation }: ScreenProps<'ForgotPassword'>) {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [sending, setSending] = useState<Channel | null>(null);

  /** Email stays as typed (lower-cased); phone numbers become E.164. */
  const normalized = () => (isEmail(identifier) ? identifier.trim().toLowerCase() : toE164(identifier));

  const onSend = () => {
    if (!identifier.trim()) return setError('Please enter your registered email or phone number.');
    if (!normalized()) return setError('Please enter a valid email address or phone number.');
    setError(null);
    setModal(true);
  };

  const closeWithError = (message: string) => {
    setSending(null);
    setModal(false);
    setError(message);
  };

  const onChannel = async (channel: Channel) => {
    const id = normalized()!;
    setSending(channel);
    try {
      if (channel === 'email') {
        // A 6-digit code goes to the account's email; the user types it on the next screen (like SMS).
        const res = await sendPasswordResetCode(id);
        setSending(null);
        setModal(false);
        if (res.status === 'already-verified') return;
        if (res.status === 'locked') {
          setError(`You’ve entered the wrong code multiple times. Please try again after ${minutesFromSeconds(res.retryAfterSeconds)} minutes.`);
          return;
        }
        navigation.navigate('ResetVerify', {
          channel: 'email',
          identifier: id,
          destination: res.destination,
          cooldownSeconds: res.status === 'sent' ? res.cooldownSeconds : res.retryAfterSeconds,
        });
        return;
      }

      // SMS: Firebase sends the code to the number itself, so a phone number is required.
      if (isEmail(id)) {
        return closeWithError('To reset via SMS, please enter your registered phone number.');
      }
      // Test mode: no SMS is sent; the next screen accepts the fixed test code.
      if (isDevOtp()) {
        const res = await sendTestSmsResetCode(id);
        if (res.status === 'locked') {
          return closeWithError(
            `You’ve entered the wrong code multiple times. Please try again after ${minutesFromSeconds(res.retryAfterSeconds)} minutes.`,
          );
        }
        setSending(null);
        setModal(false);
        navigation.navigate('ResetVerify', { channel: 'sms', phone: id });
        return;
      }
      const locked = await phoneLockRemaining(id);
      if (locked > 0) {
        return closeWithError(
          `You’ve entered the wrong code multiple times. Please try again after ${minutesFromSeconds(locked)} minutes.`,
        );
      }
      if ((await isPhoneAvailable(id)) === true) {
        return closeWithError('No account found with this phone number.');
      }
      await sendSignInCode(id);
      setSending(null);
      setModal(false);
      navigation.navigate('ResetVerify', { channel: 'sms', phone: id });
    } catch (e) {
      closeWithError(
        errorCode(e) === 'not-found' && !isFunctionMissing(e)
          ? 'No account found with this email or phone number.'
          : friendlyError(e),
      );
    }
  };

  return (
    <AuthLayout footer={<Button title="Send Verification Code" onPress={onSend} />}>
      <TitleBlock
        title="Forgot Password"
        subtitle="Enter your registered email or phone number to reset your password."
      />
      <View style={styles.fields}>
        <TextField
          label="Email or Phone Number"
          placeholder="Enter your registered email or phone number"
          value={identifier}
          onChangeText={(v) => {
            setIdentifier(v);
            if (error) setError(null);
          }}
          error={error}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="send"
          onSubmitEditing={onSend}
        />
      </View>

      <ChannelModal
        visible={modal}
        loading={sending}
        initial={isEmail(identifier) ? 'email' : 'sms'}
        onClose={() => setModal(false)}
        onSelect={onChannel}
      />

    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: { marginTop: 34 },
});
