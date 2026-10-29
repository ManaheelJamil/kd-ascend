import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import TitleBlock from '../components/TitleBlock';
import TextField from '../components/TextField';
import Button from '../components/Button';
import AccountCreatedModal from './AccountCreatedModal';
import { useAuth } from '../context/AuthContext';
import { submitApplication } from '../services/userService';
import { friendlyError } from '../services/errors';
import { hasErrors, required } from '../utils/validation';
import { text } from '../theme';
import type { ScreenProps } from '../navigation/types';

/** PayNow accepts a Singapore mobile number (8 digits, starts with 8/9) or an NRIC/FIN/UEN. */
export function validatePayNowId(value: string): string | null {
  const v = value.replace(/\s+/g, '').toUpperCase();
  if (!v) return 'Please enter your PayNow mobile number or NRIC.';
  if (/^(\+?65)?[89]\d{7}$/.test(v)) return null;
  if (/^[STFGM]\d{7}[A-Z]$/.test(v)) return null;
  if (/^(\d{8,9}[A-Z]|[TS]\d{2}[A-Z]{2}\d{4}[A-Z])$/.test(v)) return null; // UEN
  return 'Please enter a valid PayNow mobile number or NRIC.';
}

export default function PayNowDetailsScreen({ navigation }: ScreenProps<'PayNowDetails'>) {
  const { user, profile, lockRouting, unlockRouting } = useAuth();
  const saved = profile?.payout?.method === 'paynow' ? profile.payout : null;
  const [name, setName] = useState(saved?.paynowName ?? profile?.profile?.fullName ?? '');
  const [paynowId, setPaynowId] = useState(saved?.paynowId ?? '');
  const [errors, setErrors] = useState<{ name?: string | null; id?: string | null; form?: string | null }>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    const next = { name: required(name, 'Please enter your PayNow name.'), id: validatePayNowId(paynowId) };
    setErrors(next);
    if (hasErrors(next) || !user) return;

    setLoading(true);
    // Keep this screen up so the "Account Created" popup can show before Home.
    lockRouting();
    try {
      await submitApplication(user.uid, {
        method: 'paynow',
        paynowName: name.trim(),
        paynowId: paynowId.replace(/\s+/g, '').toUpperCase(),
      });
      setDone(true);
    } catch (e) {
      unlockRouting();
      setErrors({ form: friendlyError(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      onBack={() => navigation.goBack()}
      sheetPaddingTop={32}
      footer={
        <View style={styles.footer}>
          {errors.form ? <Text style={[text.fieldError, styles.center]}>{errors.form}</Text> : null}
          <Button title="Submit Application" onPress={onSubmit} loading={loading} />
        </View>
      }
    >
      <TitleBlock
        title="PayNow Account Details"
        subtitle="Please provide your PayNow details to receive payments securely and without delays."
      />
      <View style={styles.fields}>
        <TextField
          label="PayNow Name"
          placeholder="PayNow Name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (errors.name) setErrors((e) => ({ ...e, name: null }));
          }}
          error={errors.name}
          autoCapitalize="words"
        />
        <TextField
          label="PayNow Mobile Number / NRIC"
          placeholder="PayNow Mobile Number / NRIC"
          value={paynowId}
          onChangeText={(v) => {
            setPaynowId(v);
            if (errors.id) setErrors((e) => ({ ...e, id: null }));
          }}
          error={errors.id}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      <AccountCreatedModal visible={done} onDone={unlockRouting} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: { marginTop: 30, gap: 17 },
  footer: { gap: 12 },
  center: { textAlign: 'center' },
});
