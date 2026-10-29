import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import TitleBlock from '../components/TitleBlock';
import TextField from '../components/TextField';
import Checkbox from '../components/Checkbox';
import Button from '../components/Button';
import { FlippedY } from '../components/Icons';
import { Svg } from '../assets';
import { colors, fonts, text } from '../theme';
import { login } from '../services/authService';
import { errorCode, friendlyError } from '../services/errors';
import { validateEmail } from '../utils/validation';
import type { ScreenProps } from '../navigation/types';

export default function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null; form?: string | null }>({});
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const onLogin = async () => {
    const next = {
      email: validateEmail(email),
      password: password ? null : 'Please enter your password.',
      form: null,
    };
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    try {
      await login(email, password, remember);
      // RootNavigator moves on once the session and profile are loaded.
    } catch (e) {
      const code = errorCode(e);
      if (code === 'auth/invalid-email') setErrors({ email: friendlyError(e) });
      else setErrors({ form: friendlyError(e) });
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <TitleBlock title="Sign in" subtitle="Sign in to manage your account and access all features." />

      <View style={styles.fields}>
        <TextField
          label="Email Address"
          placeholder="Email Address"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (errors.email || errors.form) setErrors({});
          }}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          placeholder="Password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (errors.password || errors.form) setErrors({});
          }}
          error={errors.password}
          password
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={onLogin}
        />

        <View style={styles.row}>
          <Checkbox
            checked={remember}
            onChange={setRemember}
            label={<Text style={text.small}>Remember me</Text>}
          />
          <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8} accessibilityRole="link">
            <Text style={text.linkMedium}>Forgot Password?</Text>
          </Pressable>
        </View>

        {errors.form ? <Text style={[text.fieldError, styles.formError]}>{errors.form}</Text> : null}
      </View>

      <View style={styles.actions}>
        <Button
          title="Login"
          onPress={onLogin}
          loading={loading}
          left={
            <FlippedY>
              <Svg.IconLogin />
            </FlippedY>
          }
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Don’t have an account?</Text>
          <Pressable onPress={() => navigation.navigate('SignUp')} hitSlop={8} accessibilityRole="link">
            <Text style={text.link}>Sign Up</Text>
          </Pressable>
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: { marginTop: 32, gap: 25 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  formError: { marginTop: -11 },
  actions: { marginTop: 43, gap: 14, alignItems: 'stretch' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  switchText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18.48, color: colors.text },
});
