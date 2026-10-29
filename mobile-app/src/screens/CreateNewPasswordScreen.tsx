import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import TitleBlock from '../components/TitleBlock';
import TextField from '../components/TextField';
import Button from '../components/Button';
import ResultModal from '../components/ResultModal';
import { useAuth } from '../context/AuthContext';
import { changePassword, isCurrentPassword, signOut } from '../services/authService';
import { notifyPasswordChanged, resetPasswordWithToken } from '../services/otpService';
import { friendlyError } from '../services/errors';
import { validateConfirm, validatePassword } from '../utils/validation';
import { text } from '../theme';
import type { ScreenProps } from '../navigation/types';

const SAME_PASSWORD = 'Your new password must be different from the previous one.';

export default function CreateNewPasswordScreen({ navigation, route }: ScreenProps<'CreateNewPassword'>) {
  const params = route.params;
  const { unlockRouting } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null; form?: string | null }>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const confirmRef = useRef<TextInput>(null);
  const finished = useRef(false);

  // Leaving the SMS flow half-way: drop the phone sign-in so nobody stays logged in.
  useEffect(() => {
    return () => {
      if (params.mode === 'sms' && !finished.current) {
        signOut().catch(() => undefined).finally(unlockRouting);
      }
    };
  }, [params.mode, unlockRouting]);

  const onReset = async () => {
    const next = { password: validatePassword(password), confirm: validateConfirm(password, confirm) };
    setErrors(next);
    if (next.password || next.confirm) return;

    setLoading(true);
    try {
      if (params.mode === 'sms') {
        if (await isCurrentPassword(password)) {
          setErrors({ password: SAME_PASSWORD });
          return;
        }
        await changePassword(password);
        await notifyPasswordChanged();
        await signOut();
      } else {
        const res = await resetPasswordWithToken(params.resetToken, password);
        if (res.status === 'same-password') {
          setErrors({ password: SAME_PASSWORD });
          return;
        }
        if (res.status === 'expired') {
          Alert.alert('Session expired', 'Your reset session has expired. Please request a new code.', [
            { text: 'OK', onPress: () => navigation.popToTop() },
          ]);
          return;
        }
      }
      finished.current = true;
      setDone(true);
    } catch (e) {
      setErrors({ form: friendlyError(e) });
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    setDone(false);
    unlockRouting();
    navigation.popToTop();
  };

  return (
    <AuthLayout footer={<Button title="Reset Password" onPress={onReset} loading={loading} />}>
      <TitleBlock title="Create New Password" subtitle="Your new password must be different from the previous one." />

      <View style={styles.fields}>
        <TextField
          label="New Password"
          placeholder="Enter new password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (errors.password || errors.form) setErrors((e) => ({ ...e, password: null, form: null }));
          }}
          error={errors.password}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <TextField
          ref={confirmRef}
          label="Confirm New Password"
          placeholder="Confirm new password"
          value={confirm}
          onChangeText={(v) => {
            setConfirm(v);
            if (errors.confirm) setErrors((e) => ({ ...e, confirm: null }));
          }}
          error={errors.confirm}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={onReset}
        />
        {errors.form ? <Text style={text.fieldError}>{errors.form}</Text> : null}
      </View>

      <ResultModal
        visible={done}
        title="Password Reset Successful"
        message="Your password has been updated successfully. You can now log in using your new password."
        buttonLabel="Go To Login"
        onPress={goToLogin}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: { marginTop: 34, gap: 25 },
});
