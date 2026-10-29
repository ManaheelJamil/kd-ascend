import React, { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import TitleBlock from '../components/TitleBlock';
import TextField from '../components/TextField';
import Checkbox from '../components/Checkbox';
import Button from '../components/Button';
import { FlippedY } from '../components/Icons';
import { Svg } from '../assets';
import { colors, fonts, text } from '../theme';
import { config } from '../config';
import { isPhoneAvailable, register } from '../services/authService';
import { errorCode, friendlyError } from '../services/errors';
import SelectModal from '../components/SelectModal';
import {
  COUNTRIES,
  defaultCountry,
  hasErrors,
  toE164,
  validateConfirm,
  validateEmail,
  validatePassword,
  validatePhone,
} from '../utils/validation';
import type { ScreenProps } from '../navigation/types';

type Errors = Partial<Record<'email' | 'phone' | 'password' | 'confirm' | 'terms' | 'form', string | null>>;

export default function SignUpScreen({ navigation }: ScreenProps<'SignUp'>) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  /** Pakistan or Singapore — SMS codes are only sent to these. */
  const [country, setCountry] = useState(defaultCountry());
  const [countryOpen, setCountryOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const clear = (key: keyof Errors) => errors[key] && setErrors((e) => ({ ...e, [key]: null, form: null }));

  const onRegister = async () => {
    if (!agreed) return; // Register stays disabled until the Terms & Privacy Policy box is ticked.
    const next: Errors = {
      email: validateEmail(email),
      phone: validatePhone(phone, country),
      password: validatePassword(password),
      confirm: validateConfirm(password, confirm),
      terms: agreed ? null : 'Please agree to the Terms & Privacy Policy.',
    };
    setErrors(next);
    if (hasErrors(next)) return;

    const phoneE164 = toE164(phone, country)!;
    setLoading(true);
    try {
      if ((await isPhoneAvailable(phoneE164)) === false) {
        setErrors({ phone: 'This phone number is already linked to another account.' });
        setLoading(false);
        return;
      }
      await register(email, phoneE164, password);
      // RootNavigator switches to phone verification.
    } catch (e) {
      const code = errorCode(e);
      if (code === 'auth/email-already-in-use' || code === 'auth/invalid-email') setErrors({ email: friendlyError(e) });
      else if (code === 'auth/weak-password') setErrors({ password: friendlyError(e) });
      else setErrors({ form: friendlyError(e) });
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      footer={
        <View style={styles.actions}>
          {errors.form ? <Text style={[text.fieldError, styles.center]}>{errors.form}</Text> : null}
          <Button
            title="Register"
            onPress={onRegister}
            loading={loading}
            disabled={!agreed}
            left={
              <FlippedY>
                <Svg.IconRegister />
              </FlippedY>
            }
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account?</Text>
            <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8} accessibilityRole="link">
              <Text style={text.link}>Login</Text>
            </Pressable>
          </View>
        </View>
      }
    >
      <TitleBlock title="Sign Up" subtitle="Sign up an account to access all features" />

      <View style={styles.fields}>
        <TextField
          label="Email Address"
          placeholder="Email Address"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            clear('email');
          }}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
        />
        <TextField
          ref={phoneRef}
          label="Phone Number"
          placeholder={country.example}
          left={
            <Pressable
              onPress={() => setCountryOpen(true)}
              hitSlop={8}
              style={styles.country}
              accessibilityRole="button"
              accessibilityLabel={`Country code ${country.name} ${country.dial}. Change`}
            >
              <Text style={styles.countryText}>
                {country.flag} {country.dial}
              </Text>
              <Svg.IconChevronDown />
            </Pressable>
          }
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            clear('phone');
          }}
          error={errors.phone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
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
            clear('password');
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
          label="Confirm Password"
          placeholder="Confirm Password"
          value={confirm}
          onChangeText={(v) => {
            setConfirm(v);
            clear('confirm');
          }}
          error={errors.confirm}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={onRegister}
        />

        <View style={styles.termsWrap}>
          <Checkbox
            checked={agreed}
            onChange={(v) => {
              setAgreed(v);
              clear('terms');
            }}
            borderColor={colors.dark}
            error={!!errors.terms}
            label={
              <Text style={styles.terms}>
                I agree to the{' '}
                <Text style={styles.termsLink} onPress={() => Linking.openURL(config.termsUrl)}>
                  Terms
                </Text>{' '}
                &{' '}
                <Text style={styles.termsLink} onPress={() => Linking.openURL(config.privacyUrl)}>
                  Privacy Policy
                </Text>
              </Text>
            }
          />
          {errors.terms ? <Text style={text.fieldError}>{errors.terms}</Text> : null}
        </View>
      </View>
      <SelectModal
        visible={countryOpen}
        title="Select Country"
        options={COUNTRIES.map((c) => `${c.flag}  ${c.name} (${c.dial})`)}
        value={`${country.flag}  ${country.name} (${country.dial})`}
        onSelect={(v) => {
          const c = COUNTRIES.find((x) => v.includes(`(${x.dial})`));
          if (c) setCountry(c);
          setCountryOpen(false);
          clear('phone');
        }}
        onClose={() => setCountryOpen(false)}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: '100%',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: colors.stroke,
  },
  countryText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  fields: { marginTop: 21, gap: 25 },
  termsWrap: { gap: 10 },
  terms: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17.16, color: colors.text },
  termsLink: { textDecorationLine: 'underline' },
  actions: { gap: 14 },
  center: { textAlign: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  switchText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18.48, color: colors.text },
});
