import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import AccountLayout from '../components/AccountLayout';
import TitleBlock from '../components/TitleBlock';
import TextField from '../components/TextField';
import Button from '../components/Button';
import SelectModal from '../components/SelectModal';
import UploadBox from '../components/UploadBox';
import { BankIcon } from '../components/Icons';
import { images, Svg } from '../assets';
import { useAuth } from '../context/AuthContext';
import { updatePayout, type Payout } from '../services/userService';
import { pickDocument, uploadUserFile, type PickedFile } from '../services/storageService';
import { friendlyError } from '../services/errors';
import { SINGAPORE_BANKS } from '../data/options';
import { hasErrors, required } from '../utils/validation';
import { validatePayNowId } from './PayNowDetailsScreen';
import { colors, fonts, layout, text } from '../theme';
import type { ScreenProps } from '../navigation/types';

type Method = Payout['method'];
type Errors = Partial<Record<'name' | 'id' | 'bank' | 'holder' | 'number' | 'statement' | 'form', string | null>>;

function Radio({ on }: { on: boolean }) {
  return on ? <Svg.IconRadioOn /> : <View style={styles.radioOff} />;
}

function MethodOption({
  method,
  active,
  onPress,
}: {
  method: Method;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, method === 'bank' && styles.bankOption, active && styles.optionActive]}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={method === 'paynow' ? 'PayNow' : 'Bank Transfer'}
    >
      {method === 'paynow' ? (
        <Image source={images.paynow} style={styles.paynow} resizeMode="cover" />
      ) : (
        <View style={styles.bankLabel}>
          <BankIcon />
          <Text style={styles.bankText}>Bank Transfer</Text>
        </View>
      )}
      <Radio on={active} />
    </Pressable>
  );
}

/**
 * Figma "Payment Details" (196:5120 PayNow, 249:317 Bank Transfer): the selected method sits on
 * top with its form underneath; the other method is listed below (PayNow) or above (bank).
 */
export default function PaymentDetailsScreen({ navigation }: ScreenProps<'PaymentDetails'>) {
  const { user, profile } = useAuth();
  const payout = profile?.payout;
  const paynowSaved = payout?.method === 'paynow' ? payout : null;
  const bankSaved = payout?.method === 'bank' ? payout : null;

  const [method, setMethod] = useState<Method>(payout?.method ?? 'paynow');
  const [name, setName] = useState(paynowSaved?.paynowName ?? profile?.profile?.fullName ?? '');
  const [paynowId, setPaynowId] = useState(paynowSaved?.paynowId ?? '');
  const [bank, setBank] = useState(bankSaved?.bankName ?? '');
  const [holder, setHolder] = useState(bankSaved?.accountHolderName ?? profile?.profile?.fullName ?? '');
  const [number, setNumber] = useState(bankSaved?.accountNumber ?? '');
  const [statement, setStatement] = useState<PickedFile | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [selectOpen, setSelectOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const clear = (key: keyof Errors) =>
    (errors[key] || errors.form) && setErrors((e) => ({ ...e, [key]: null, form: null }));

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

  const onSave = async () => {
    if (!user) return;
    let next: Errors;
    const digits = number.replace(/[\s-]/g, '');
    if (method === 'paynow') {
      next = { name: required(name, 'Please enter your PayNow name.'), id: validatePayNowId(paynowId) };
    } else {
      next = {
        bank: required(bank, 'Please select your bank.'),
        holder: required(holder, 'Please enter the account holder name.'),
        number: !digits
          ? 'Please enter your account number.'
          : /^\d{6,17}$/.test(digits)
            ? null
            : 'Please enter a valid account number.',
        statement: statement || bankSaved?.statement ? null : 'Please upload a bank statement or receipt.',
      };
    }
    setErrors(next);
    if (hasErrors(next)) return;

    setLoading(true);
    try {
      if (method === 'paynow') {
        await updatePayout(user.uid, {
          method: 'paynow',
          paynowName: name.trim(),
          paynowId: paynowId.replace(/\s+/g, '').toUpperCase(),
        });
      } else {
        const stored = statement ? await uploadUserFile(user.uid, 'bank-statement', statement) : bankSaved!.statement;
        await updatePayout(user.uid, {
          method: 'bank',
          bankName: bank,
          accountHolderName: holder.trim(),
          accountNumber: digits,
          statement: stored,
        });
      }
      Alert.alert('Payment details saved', 'Your payout details have been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setErrors({ form: friendlyError(e) });
    } finally {
      setLoading(false);
    }
  };

  const pick = (m: Method) => {
    setMethod(m);
    setErrors({});
  };

  return (
    <AccountLayout
      title="Payment Details"
      onBack={() => navigation.goBack()}
      contentTop={19}
      footer={
        <View style={styles.footer}>
          {errors.form ? <Text style={[text.fieldError, styles.center]}>{errors.form}</Text> : null}
          <Button title="Save Changes" onPress={onSave} loading={loading} />
        </View>
      }
    >
      <View accessibilityRole="radiogroup">
        {method === 'bank' ? (
          <View style={styles.optionsTop}>
            <MethodOption method="paynow" active={false} onPress={() => pick('paynow')} />
            <MethodOption method="bank" active onPress={() => pick('bank')} />
          </View>
        ) : (
          <MethodOption method="paynow" active onPress={() => pick('paynow')} />
        )}

        {method === 'paynow' ? (
          <>
            <TitleBlock
              style={styles.title}
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
                  clear('name');
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
                  clear('id');
                }}
                error={errors.id}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <MethodOption method="bank" active={false} onPress={() => pick('bank')} />
            </View>
          </>
        ) : (
          <>
            <TitleBlock
              style={styles.title}
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
                  value={statement ?? bankSaved?.statement ?? null}
                  onPress={browse}
                  error={errors.statement}
                  loading={loading}
                />
              </View>
            </View>
          </>
        )}
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
    </AccountLayout>
  );
}

const styles = StyleSheet.create({
  optionsTop: { gap: 18 },
  option: {
    height: 48,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.stroke,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 17,
    paddingRight: 13,
  },
  optionActive: { borderColor: colors.main },
  bankOption: { paddingLeft: 15 },
  paynow: { width: 90, height: 17.54 },
  bankLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bankText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18.48, color: colors.black },
  radioOff: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.11, borderColor: colors.dark },
  title: { marginTop: 22 },
  fields: { marginTop: 30, gap: 17 },
  upload: { gap: 12 },
  footer: { gap: 12 },
  center: { textAlign: 'center' },
});
