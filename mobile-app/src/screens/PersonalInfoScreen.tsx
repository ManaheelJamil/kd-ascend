import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import TitleBlock from '../components/TitleBlock';
import TextField from '../components/TextField';
import Button from '../components/Button';
import Stepper from '../components/Stepper';
import SelectModal from '../components/SelectModal';
import DatePickerModal from '../components/DatePickerModal';
import { ArrowIcon, CalendarIcon } from '../components/Icons';
import { Svg } from '../assets';
import { useAuth } from '../context/AuthContext';
import { savePersonalInfo, type PersonalInfo } from '../services/userService';
import { friendlyError } from '../services/errors';
import { COUNTRIES, GENDERS } from '../data/options';
import { formatDate, fromIsoDate, toIsoDate } from '../utils/format';
import { hasErrors, required, validateNric } from '../utils/validation';
import { text } from '../theme';
import type { ScreenProps } from '../navigation/types';
import { isDevPrefill } from '../services/devOtp';
import { devTestData } from '../data/devTestData';

type SelectKey = 'gender' | 'nationality' | 'placeOfBirth';
type Errors = Partial<Record<keyof PersonalInfo | 'form', string | null>>;

const SELECTS: Record<SelectKey, { title: string; options: readonly string[] }> = {
  gender: { title: 'Gender', options: GENDERS },
  nationality: { title: 'Nationality', options: COUNTRIES },
  placeOfBirth: { title: 'Place of Birth', options: COUNTRIES },
};

export default function PersonalInfoScreen({ navigation }: ScreenProps<'PersonalInfo'>) {
  const { user, profile } = useAuth();
  const saved = profile?.profile;
  const t = isDevPrefill() ? devTestData.personal : null;
  const [form, setForm] = useState<PersonalInfo>({
    fullName: saved?.fullName ?? '',
    nric: saved?.nric ?? t?.nric ?? '',
    gender: saved?.gender ?? '',
    nationality: saved?.nationality ?? '',
    dateOfBirth: saved?.dateOfBirth ?? '',
    placeOfBirth: saved?.placeOfBirth ?? '',
    address: saved?.address ?? '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [select, setSelect] = useState<SelectKey | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof PersonalInfo, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  const onNext = async () => {
    const next: Errors = {
      fullName: required(form.fullName, 'Please enter your full name.'),
      nric: validateNric(form.nric),
      gender: required(form.gender, 'Please select your gender.'),
      nationality: required(form.nationality, 'Please select your nationality.'),
      dateOfBirth: required(form.dateOfBirth, 'Please select your date of birth.'),
      placeOfBirth: required(form.placeOfBirth, 'Please select your place of birth.'),
      address: required(form.address, 'Please enter your address.'),
    };
    setErrors(next);
    if (hasErrors(next) || !user) return;

    setLoading(true);
    try {
      await savePersonalInfo(user.uid, {
        ...form,
        fullName: form.fullName.trim(),
        nric: form.nric.trim().toUpperCase(),
        address: form.address.trim(),
      });
      navigation.navigate('IdentityUpload');
    } catch (e) {
      setErrors({ form: friendlyError(e) });
    } finally {
      setLoading(false);
    }
  };

  const dob = fromIsoDate(form.dateOfBirth);
  const chevron = <Svg.IconChevronDown />;

  return (
    <AuthLayout
      sheetPaddingTop={30}
      footer={
        <View style={styles.footer}>
          {errors.form ? <Text style={[text.fieldError, styles.center]}>{errors.form}</Text> : null}
          <Button title="Next" onPress={onNext} loading={loading} right={<ArrowIcon />} />
        </View>
      }
    >
      <Stepper current={1} />
      <TitleBlock
        style={styles.title}
        title="Personal Information"
        subtitle="Provide your personal details as they appear on your official ID."
      />

      <View style={styles.fields}>
        <TextField
          label="Full Name"
          placeholder="Full Name"
          value={form.fullName}
          onChangeText={(v) => set('fullName', v)}
          error={errors.fullName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
        <TextField
          label="NRIC"
          placeholder="NRIC"
          value={form.nric}
          onChangeText={(v) => set('nric', v)}
          error={errors.nric}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={9}
        />
        <TextField
          label="Gender"
          placeholder="Select"
          value={form.gender}
          onPressField={() => setSelect('gender')}
          right={chevron}
          error={errors.gender}
        />
        <TextField
          label="Nationality"
          placeholder="Select"
          value={form.nationality}
          onPressField={() => setSelect('nationality')}
          right={chevron}
          error={errors.nationality}
        />
        <TextField
          label="Date of Birth"
          placeholder="dd/mm/yyyy"
          value={dob ? formatDate(dob) : ''}
          onPressField={() => setDateOpen(true)}
          right={<CalendarIcon />}
          error={errors.dateOfBirth}
        />
        <TextField
          label="Place of Birth"
          placeholder="Select"
          value={form.placeOfBirth}
          onPressField={() => setSelect('placeOfBirth')}
          right={chevron}
          error={errors.placeOfBirth}
        />
        <TextField
          label="Address"
          placeholder="Address"
          value={form.address}
          onChangeText={(v) => set('address', v)}
          error={errors.address}
          autoComplete="street-address"
          textContentType="fullStreetAddress"
        />
      </View>

      <SelectModal
        visible={!!select}
        title={select ? SELECTS[select].title : ''}
        options={select ? SELECTS[select].options : []}
        value={select ? form[select] : null}
        onClose={() => setSelect(null)}
        onSelect={(v) => {
          if (select) set(select, v);
          setSelect(null);
        }}
      />
      <DatePickerModal
        visible={dateOpen}
        value={dob}
        onClose={() => setDateOpen(false)}
        onSave={(d) => {
          set('dateOfBirth', toIsoDate(d));
          setDateOpen(false);
        }}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 26 },
  fields: { marginTop: 32, gap: 25 },
  footer: { gap: 12 },
  center: { textAlign: 'center' },
});
