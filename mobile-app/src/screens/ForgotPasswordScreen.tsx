import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import TitleBlock from '../components/TitleBlock';
import TextField from '../components/TextField';
import Button from '../components/Button';
import ChannelModal, { type Channel } from '../components/ChannelModal';
import { isEmail, toE164 } from '../utils/validation';
import { sendPasswordResetLink } from '../services/otpService';
import ResultModal from '../components/ResultModal';
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
  /** Masked address the reset link went to; shows the "Check Your Email" popup. */
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);

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
        // The email holds a "Reset Password" button that opens the reset page (valid 24 hours).
        const res = await sendPasswordResetLink(id);
        setSending(null);
        setModal(false);
        if (res.status === 'cooldown') {
          setError(`We’ve just sent a reset link to ${res.destination}. Please check your email or try again in ${res.retryAfterSeconds} seconds.`);
          return;
        }
        setLinkSentTo(res.destination);
        return;
      }

      // SMS: Firebase sends the code to the number itself, so a phone number is required.
      if (isEmail(id)) {
        return closeWithError('To reset via SMS, please enter your registered phone number.');
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

      <ResultModal
        visible={!!linkSentTo}
        title="Check Your Email"
        message={`We’ve sent a password reset link to ${linkSentTo ?? 'your email'}. Tap “Reset Password” in the email to create a new password, then log in here.`}
        buttonLabel="Back To Login"
        onPress={() => {
          setLinkSentTo(null);
          navigation.popToTop();
        }}
        onClose={() => setLinkSentTo(null)}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: { marginTop: 34 },
});
