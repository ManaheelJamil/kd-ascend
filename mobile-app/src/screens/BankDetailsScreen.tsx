import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import TitleBlock from '../components/TitleBlock';
import TextField from '../components/TextField';
import Button from '../components/Button';
import SelectModal from '../components/SelectModal';
import UploadBox from '../components/UploadBox';
import AccountCreatedModal from './AccountCreatedModal';
import { Svg } from '../assets';
import { useAuth } from '../context/AuthContext';
import { submitApplication } from '../services/userService';
import { pickDocument, uploadUserFile, type PickedFile } from '../services/storageService';
import { friendlyError } from '../services/errors';
import { SINGAPORE_BANKS } from '../data/options';
import { hasErrors, required } from '../utils/validation';
import { text } from '../theme';
import type { ScreenProps } from '../navigation/types';

type Errors = Partial<Record<'bank' | 'holder' | 'number' | 'statement' | 'form', string | null>>;

export default function BankDetailsScreen({ navigation }: ScreenProps<'BankDetails'>) {
  const { user, profile, lockRouting, unlockRouting } = useAuth();
  const saved = profile?.payout?.method === 'bank' ? profile.payout : null;
  const [bank, setBank] = useState(saved?.bankName ?? '');
  const [holder, setHolder] = useState(saved?.accountHolderName ?? profile?.profile?.fullName ?? '');
  const [number, setNumber] = useState(saved?.accountNumber ?? '');
  const [statement, setStatement] = useState<PickedFile | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [selectOpen, setSelectOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const clear = (key: keyof Errors) => errors[key] && setErrors((e) => ({ ...e, [key]: null, form: null }));

  const browse = async () => {
    try {
      const picked = await pickDocument();
      if (picked) {
        setStatement(picked);
        clear('statement');
      }
    } catch (e) {
      setErrors((x) => ({ ...x, statement: e instanceof Error ? e.message : friendlyError(e) }));
    }
  };

  const onSubmit = async () => {
    const digits = number.replace(/[\s-]/g, '');
    const next: Errors = {
      bank: required(bank, 'Please select your bank.'),
      holder: required(holder, 'Please enter the account holder name.'),
      number: !digits
        ? 'Please enter your account number.'
        : /^\d{6,17}$/.test(digits)
          ? null
          : 'Please enter a valid account number.',
      statement: statement || saved?.statement ? null : 'Please upload a bank statement or receipt.',
    };
    setErrors(next);
    if (hasErrors(next) || !user) return;

    setLoading(true);
    lockRouting();
    try {
      const stored = statement ? await uploadUserFile(user.uid, 'bank-statement', statement) : saved!.statement;
      await submitApplication(user.uid, {
        method: 'bank',
        bankName: bank,
        accountHolderName: holder.trim(),
        accountNumber: digits,
        statement: stored,
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
        title="Bank Transfer Details"
        subtitle="Set up your bank account to receive payments securely via bank transfer."
      />
      <View style={styles.fields}>
        <TextField
          label="Bank Name"
          placeholder="Select"
          value={bank}
          onPressField={() => setSelectOpen(true)}
          right={<Svg.IconChevronDown />}
          error={errors.bank}
        />
        <TextField
          label="Account Holder Name"
          placeholder="Account Holder Name"
          value={holder}
          onChangeText={(v) => {
            setHolder(v);
            clear('holder');
          }}
          error={errors.holder}
          autoCapitalize="words"
        />
        <TextField
          label="Account Number"
          placeholder="Account Number"
          value={number}
          onChangeText={(v) => {
            setNumber(v);
            clear('number');
          }}
          error={errors.number}
          keyboardType="number-pad"
        />
        <View style={styles.upload}>
          <Text style={text.label}>Upload Bank Statement / Receipt</Text>
          <UploadBox
            value={statement ?? saved?.statement ?? null}
            onPress={browse}
            error={errors.statement}
            loading={loading}
          />
        </View>
      </View>

      <SelectModal
        visible={selectOpen}
        title="Bank Name"
        options={SINGAPORE_BANKS}
        value={bank}
        onClose={() => setSelectOpen(false)}
        onSelect={(v) => {
          setBank(v);
          clear('bank');
          setSelectOpen(false);
        }}
      />
      <AccountCreatedModal visible={done} onDone={unlockRouting} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: { marginTop: 29, gap: 17 },
  upload: { gap: 12 },
  footer: { gap: 12 },
  center: { textAlign: 'center' },
});
