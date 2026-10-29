// ============================================================================
// DEVELOPMENT BRANCH: this feature is switched off for testing.
// Not in FOR_TESTING scope (Account > Edit Profile). Uncomment the whole file to bring it back
// (and the matching lines marked "DEV BRANCH" in RootNavigator.tsx / types.ts).
// ============================================================================
// import React, { useMemo, useState } from 'react';
// import { Alert, StyleSheet, Text, View } from 'react-native';
// import AccountLayout from '../components/AccountLayout';
// import TextField from '../components/TextField';
// import Button from '../components/Button';
// import SelectModal from '../components/SelectModal';
// import DatePickerModal from '../components/DatePickerModal';
// import { ConfirmReviewModal, PendingReviewModal } from '../components/AccountModals';
// import { CalendarIcon } from '../components/Icons';
// import { Svg } from '../assets';
// import { useAuth } from '../context/AuthContext';
// import { updateProfileForReview, type PersonalInfo } from '../services/userService';
// import { friendlyError } from '../services/errors';
// import { COUNTRIES, GENDERS } from '../data/options';
// import { formatDate, fromIsoDate, toIsoDate } from '../utils/format';
// import { hasErrors, required, validateNric } from '../utils/validation';
// import { colors, text } from '../theme';
// import type { ScreenProps } from '../navigation/types';
//
// type SelectKey = 'gender' | 'nationality';
// type Form = Pick<PersonalInfo, 'fullName' | 'nric' | 'gender' | 'nationality' | 'dateOfBirth'>;
// type Errors = Partial<Record<keyof Form | 'form', string | null>>;
//
// const SELECTS: Record<SelectKey, { title: string; options: readonly string[] }> = {
//   gender: { title: 'Gender', options: GENDERS },
//   nationality: { title: 'Nationality', options: COUNTRIES },
// };
//
// /** Figma "Edit Profile" (196:4807) with the "Update Profile?" and success popups. */
// export default function EditProfileScreen({ navigation }: ScreenProps<'EditProfile'>) {
//   const { user, profile } = useAuth();
//   const saved = profile?.profile;
//   const initial: Form = useMemo(
//     () => ({
//       fullName: saved?.fullName ?? '',
//       nric: saved?.nric ?? '',
//       gender: saved?.gender ?? '',
//       nationality: saved?.nationality ?? '',
//       dateOfBirth: saved?.dateOfBirth ?? '',
//     }),
//     [saved?.fullName, saved?.nric, saved?.gender, saved?.nationality, saved?.dateOfBirth],
//   );
//   const [form, setForm] = useState<Form>(initial);
//   const [errors, setErrors] = useState<Errors>({});
//   const [select, setSelect] = useState<SelectKey | null>(null);
//   const [dateOpen, setDateOpen] = useState(false);
//   const [confirm, setConfirm] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [done, setDone] = useState(false);
//
//   const set = (key: keyof Form, value: string) => {
//     setForm((f) => ({ ...f, [key]: value }));
//     if (errors[key] || errors.form) setErrors((e) => ({ ...e, [key]: null, form: null }));
//   };
//
//   const cleaned = (): Form => ({
//     ...form,
//     fullName: form.fullName.trim(),
//     nric: form.nric.trim().toUpperCase(),
//   });
//
//   const onSave = () => {
//     const next: Errors = {
//       fullName: required(form.fullName, 'Please enter your full name.'),
//       nric: validateNric(form.nric),
//       gender: required(form.gender, 'Please select your gender.'),
//       nationality: required(form.nationality, 'Please select your nationality.'),
//       dateOfBirth: required(form.dateOfBirth, 'Please select your date of birth.'),
//     };
//     setErrors(next);
//     if (hasErrors(next)) return;
//     const c = cleaned();
//     const changed = (Object.keys(c) as (keyof Form)[]).some((k) => c[k] !== initial[k]);
//     if (!changed) {
//       Alert.alert('No changes', 'You haven’t changed any details.');
//       return;
//     }
//     setConfirm(true);
//   };
//
//   const onContinue = async () => {
//     if (!user) return;
//     setSaving(true);
//     try {
//       await updateProfileForReview(user.uid, {
//         placeOfBirth: saved?.placeOfBirth ?? '',
//         address: saved?.address ?? '',
//         ...cleaned(),
//       });
//       setConfirm(false);
//       setDone(true);
//     } catch (e) {
//       setConfirm(false);
//       setErrors({ form: friendlyError(e) });
//     } finally {
//       setSaving(false);
//     }
//   };
//
//   const dob = fromIsoDate(form.dateOfBirth);
//   const chevron = <Svg.IconChevronDown />;
//
//   return (
//     <AccountLayout
//       title="Edit Profile"
//       onBack={() => navigation.goBack()}
//       contentTop={45}
//       footer={
//         <View style={styles.footer}>
//           {errors.form ? <Text style={[text.fieldError, styles.center]}>{errors.form}</Text> : null}
//           <Button title="Save Changes" onPress={onSave} />
//         </View>
//       }
//     >
//       <View style={styles.fields}>
//         <TextField
//           label="Full Name"
//           placeholder="Full Name"
//           value={form.fullName}
//           onChangeText={(v) => set('fullName', v)}
//           error={errors.fullName}
//           autoCapitalize="words"
//           autoComplete="name"
//         />
//         <TextField
//           label="Email Address"
//           placeholder="Email Address"
//           value={user?.email ?? profile?.email ?? ''}
//           editable={false}
//           selectTextOnFocus={false}
//         />
//         <TextField
//           label="Phone Number"
//           placeholder="Phone Number"
//           value={profile?.phone ?? ''}
//           editable={false}
//           selectTextOnFocus={false}
//         />
//         <Text style={styles.note}>Email and phone number are verified and can’t be changed here.</Text>
//         <TextField
//           label="NRIC"
//           placeholder="NRIC"
//           value={form.nric}
//           onChangeText={(v) => set('nric', v)}
//           error={errors.nric}
//           autoCapitalize="characters"
//           autoCorrect={false}
//           maxLength={9}
//         />
//         <TextField
//           label="Gender"
//           placeholder="Select"
//           value={form.gender}
//           onPressField={() => setSelect('gender')}
//           right={chevron}
//           error={errors.gender}
//         />
//         <TextField
//           label="Nationality"
//           placeholder="Select"
//           value={form.nationality}
//           onPressField={() => setSelect('nationality')}
//           right={chevron}
//           error={errors.nationality}
//         />
//         <TextField
//           label="Date of Birth"
//           placeholder="dd/mm/yyyy"
//           value={dob ? formatDate(dob) : ''}
//           onPressField={() => setDateOpen(true)}
//           right={<CalendarIcon />}
//           error={errors.dateOfBirth}
//         />
//       </View>
//
//       <SelectModal
//         visible={!!select}
//         title={select ? SELECTS[select].title : ''}
//         options={select ? SELECTS[select].options : []}
//         value={select ? form[select] : null}
//         onClose={() => setSelect(null)}
//         onSelect={(v) => {
//           if (select) set(select, v);
//           setSelect(null);
//         }}
//       />
//       <DatePickerModal
//         visible={dateOpen}
//         value={dob}
//         onClose={() => setDateOpen(false)}
//         onSave={(d) => {
//           set('dateOfBirth', toIsoDate(d));
//           setDateOpen(false);
//         }}
//       />
//       <ConfirmReviewModal
//         visible={confirm}
//         title="Update Profile?"
//         message="Updating your profile details will require re-verification by our admin team. Your account status will be temporarily set to Unverified."
//         loading={saving}
//         onCancel={() => setConfirm(false)}
//         onContinue={onContinue}
//       />
//       <PendingReviewModal
//         visible={done}
//         title="Profile Updated!"
//         message="Your profile is under review. Verification may take 1–2 business days."
//         onHome={() => {
//           setDone(false);
//           navigation.navigate('Home');
//         }}
//       />
//     </AccountLayout>
//   );
// }
//
// const styles = StyleSheet.create({
//   fields: { gap: 25 },
//   note: { ...text.small, marginTop: -13, color: colors.grey },
//   footer: { gap: 12 },
//   center: { textAlign: 'center' },
// });

export {};
