import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AccountLayout from '../components/AccountLayout';
import TextField from '../components/TextField';
import Button from '../components/Button';
import SelectModal from '../components/SelectModal';
import DatePickerModal from '../components/DatePickerModal';
import UploadBox from '../components/UploadBox';
import { PendingReviewModal } from '../components/AccountModals';
import { CalendarIcon } from '../components/Icons';
import { IconChevronRight } from '../components/AccountIcons';
import { Svg } from '../assets';
import { useAuth } from '../context/AuthContext';
import type { PersonalInfo } from '../services/userService';
import { resubmitApplication, resubmitLabel, type ResubmitField } from '../services/resubmit';
import { pickDocument, uploadUserFile, type PickedFile } from '../services/storageService';
import { friendlyError } from '../services/errors';
import { COUNTRIES, GENDERS } from '../data/options';
import { formatDate, fromIsoDate, toIsoDate } from '../utils/format';
import { hasErrors, required, validateNric } from '../utils/validation';
import { DOCUMENT_TYPES } from '../data/options'; // DEV BRANCH: moved out of UploadDocumentScreen
import { colors, fonts, layout, text } from '../theme';
import type { ScreenProps } from '../navigation/types';

type PersonalKey = keyof PersonalInfo;
type SelectKey = 'gender' | 'nationality' | 'placeOfBirth' | 'docType';
type Errors = Partial<Record<PersonalKey | 'identityDocument' | 'payout' | 'form', string | null>>;

const SELECTS: Record<SelectKey, { title: string; options: readonly string[] }> = {
  gender: { title: 'Gender', options: GENDERS },
  nationality: { title: 'Nationality', options: COUNTRIES },
  placeOfBirth: { title: 'Place of Birth', options: COUNTRIES },
  docType: { title: 'Document Type', options: DOCUMENT_TYPES },
};

/** Greyed-out, non-interactive wrapper for fields the admin didn't ask to change. */
function Locked({ locked, children }: { locked: boolean; children: React.ReactNode }) {
  return (
    <View pointerEvents={locked ? 'none' : 'auto'} style={locked && styles.locked}>
      {children}
    </View>
  );
}

/**
 * Resubmit after the admin blocked / rejected the account: all saved details are pre-filled,
 * and only the fields the admin ticked can be edited. Sends the account back to review.
 */
export default function ResubmitScreen({ navigation }: ScreenProps<'Resubmit'>) {
  const { user, profile } = useAuth();
  const from = profile?.status === 'blacklisted' ? 'blacklisted' : 'rejected';
  const fields = useMemo(() => new Set((profile?.resubmitFields ?? []) as ResubmitField[]), [profile?.resubmitFields]);
  const can = (f: ResubmitField) => fields.has(f);
  const reason = from === 'blacklisted' ? profile?.blacklistReason : profile?.rejectionReason;

  const saved = profile?.profile;
  const [form, setForm] = useState<PersonalInfo>({
    fullName: saved?.fullName ?? '',
    nric: saved?.nric ?? '',
    gender: saved?.gender ?? '',
    nationality: saved?.nationality ?? '',
    dateOfBirth: saved?.dateOfBirth ?? '',
    placeOfBirth: saved?.placeOfBirth ?? '',
    address: saved?.address ?? '',
  });
  const [docType, setDocType] = useState(profile?.identityDocument?.label ?? '');
  const [docFile, setDocFile] = useState<PickedFile | null>(null);
  // Payment details are edited on the Payment Details screen; compare to know they were updated.
  const initialPayout = useRef(JSON.stringify(profile?.payout ?? null));
  const payoutChanged = JSON.stringify(profile?.payout ?? null) !== initialPayout.current;

  const [errors, setErrors] = useState<Errors>({});
  const [select, setSelect] = useState<SelectKey | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: PersonalKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key] || errors.form) setErrors((e) => ({ ...e, [key]: null, form: null }));
  };

  const browse = async () => {
    try {
      const picked = await pickDocument();
      if (picked) {
        setDocFile(picked);
        setErrors((e) => ({ ...e, identityDocument: null, form: null }));
      }
    } catch (e) {
      setErrors((x) => ({ ...x, identityDocument: e instanceof Error ? e.message : friendlyError(e) }));
    }
  };

  const onSubmit = async () => {
    if (!user) return;
    const next: Errors = {};
    if (can('fullName')) next.fullName = required(form.fullName, 'Please enter your full name.');
    if (can('nric')) next.nric = validateNric(form.nric);
    if (can('gender')) next.gender = required(form.gender, 'Please select your gender.');
    if (can('nationality')) next.nationality = required(form.nationality, 'Please select your nationality.');
    if (can('dateOfBirth')) next.dateOfBirth = required(form.dateOfBirth, 'Please select your date of birth.');
    if (can('placeOfBirth')) next.placeOfBirth = required(form.placeOfBirth, 'Please select your place of birth.');
    if (can('address')) next.address = required(form.address, 'Please enter your address.');
    if (can('identityDocument')) {
      next.identityDocument = !docType
        ? 'Please select the document type.'
        : !docFile
          ? 'Please upload a new identity document.'
          : null;
    }
    if (can('payout') && !payoutChanged) next.payout = 'Please update your payment details first.';
    setErrors(next);
    if (hasErrors(next)) return;

    setLoading(true);
    try {
      const identityDocument =
        can('identityDocument') && docFile
          ? { ...(await uploadUserFile(user.uid, 'identity', docFile)), label: docType }
          : undefined;
      await resubmitApplication(user.uid, from, {
        profile: {
          ...form,
          fullName: form.fullName.trim(),
          nric: form.nric.trim().toUpperCase(),
          address: form.address.trim(),
        },
        identityDocument,
      });
      setDone(true);
    } catch (e) {
      setErrors({ form: friendlyError(e, 'Couldn’t resubmit. Please check your connection and try again.') });
    } finally {
      setLoading(false);
    }
  };

  const dob = fromIsoDate(form.dateOfBirth);
  const chevron = <Svg.IconChevronDown />;
  const selectValue = (k: SelectKey) => (k === 'docType' ? docType : form[k]);
  const payout = profile?.payout;
  const payoutSummary = payout
    ? payout.method === 'paynow'
      ? `PayNow · ${payout.paynowName} · ${payout.paynowId}`
      : `Bank Transfer · ${payout.bankName} · ${payout.accountNumber}`
    : 'Not set';

  return (
    <AccountLayout
      title="Resubmit Details"
      onBack={() => navigation.goBack()}
      contentTop={24}
      footer={
        <View style={styles.footer}>
          {errors.form ? <Text style={[text.fieldError, styles.center]}>{errors.form}</Text> : null}
          <Button title="Resubmit For Review" onPress={onSubmit} loading={loading} />
        </View>
      }
    >
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Update: {[...fields].map(resubmitLabel).join(', ')}</Text>
        {reason ? <Text style={styles.noticeText}>Admin’s reason: {reason}</Text> : null}
        <Text style={styles.noticeText}>Your other details are kept as they are and can’t be changed here.</Text>
      </View>

      <Text style={styles.section}>Personal Information</Text>
      <View style={styles.fields}>
        <Locked locked={!can('fullName')}>
          <TextField
            label="Full Name"
            placeholder="Full Name"
            value={form.fullName}
            onChangeText={(v) => set('fullName', v)}
            editable={can('fullName')}
            error={errors.fullName}
            autoCapitalize="words"
          />
        </Locked>
        <Locked locked={!can('nric')}>
          <TextField
            label="NRIC"
            placeholder="NRIC"
            value={form.nric}
            onChangeText={(v) => set('nric', v)}
            editable={can('nric')}
            error={errors.nric}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={9}
          />
        </Locked>
        <Locked locked={!can('gender')}>
          <TextField
            label="Gender"
            placeholder="Select"
            value={form.gender}
            onPressField={() => setSelect('gender')}
            right={chevron}
            error={errors.gender}
          />
        </Locked>
        <Locked locked={!can('nationality')}>
          <TextField
            label="Nationality"
            placeholder="Select"
            value={form.nationality}
            onPressField={() => setSelect('nationality')}
            right={chevron}
            error={errors.nationality}
          />
        </Locked>
        <Locked locked={!can('dateOfBirth')}>
          <TextField
            label="Date of Birth"
            placeholder="dd/mm/yyyy"
            value={dob ? formatDate(dob) : ''}
            onPressField={() => setDateOpen(true)}
            right={<CalendarIcon />}
            error={errors.dateOfBirth}
          />
        </Locked>
        <Locked locked={!can('placeOfBirth')}>
          <TextField
            label="Place of Birth"
            placeholder="Select"
            value={form.placeOfBirth}
            onPressField={() => setSelect('placeOfBirth')}
            right={chevron}
            error={errors.placeOfBirth}
          />
        </Locked>
        <Locked locked={!can('address')}>
          <TextField
            label="Address"
            placeholder="Address"
            value={form.address}
            onChangeText={(v) => set('address', v)}
            editable={can('address')}
            error={errors.address}
          />
        </Locked>
      </View>

      <Text style={styles.section}>Identity Document</Text>
      {can('identityDocument') ? (
        <View style={styles.fields}>
          <TextField
            label="Document Type"
            placeholder="Select"
            value={docType}
            onPressField={() => setSelect('docType')}
            right={chevron}
          />
          <View style={styles.upload}>
            <Text style={text.label}>
              Upload New Document <Text style={styles.side}>(Front Side)</Text>
            </Text>
            <UploadBox value={docFile} onPress={browse} error={errors.identityDocument} loading={loading} />
          </View>
        </View>
      ) : (
        <Locked locked>
          <View style={styles.summary}>
            <Text style={styles.summaryText} numberOfLines={1}>
              {profile?.identityDocument
                ? `${profile.identityDocument.label || 'Document'} · ${profile.identityDocument.name}`
                : 'No document uploaded'}
            </Text>
          </View>
        </Locked>
      )}

      <Text style={styles.section}>Payment Details</Text>
      {can('payout') ? (
        <>
          <Pressable
            onPress={() => navigation.navigate('PaymentDetails')}
            style={[styles.summary, styles.summaryAction, !!errors.payout && styles.summaryError]}
            accessibilityRole="button"
            accessibilityLabel="Update payment details"
          >
            <View style={styles.flex}>
              <Text style={styles.summaryText} numberOfLines={1}>
                {payoutSummary}
              </Text>
              <Text style={[styles.summaryHint, payoutChanged && { color: colors.green }]}>
                {payoutChanged ? 'Updated ✓' : 'Tap to update your payment details'}
              </Text>
            </View>
            <IconChevronRight />
          </Pressable>
          {errors.payout ? <Text style={[text.fieldError, styles.errorGap]}>{errors.payout}</Text> : null}
        </>
      ) : (
        <Locked locked>
          <View style={styles.summary}>
            <Text style={styles.summaryText} numberOfLines={1}>
              {payoutSummary}
            </Text>
          </View>
        </Locked>
      )}

      <SelectModal
        visible={!!select}
        title={select ? SELECTS[select].title : ''}
        options={select ? SELECTS[select].options : []}
        value={select ? selectValue(select) || null : null}
        onClose={() => setSelect(null)}
        onSelect={(v) => {
          if (select === 'docType') {
            setDocType(v);
            setErrors((e) => ({ ...e, identityDocument: null }));
          } else if (select) set(select, v);
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
      <PendingReviewModal
        visible={done}
        title="Details Resubmitted!"
        message="Your updated details are under review. Verification may take 1–2 business days."
        onHome={() => {
          setDone(false);
          navigation.goBack();
        }}
      />
    </AccountLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notice: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,130,65,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,130,65,0.25)',
    padding: 14,
    gap: 4,
  },
  noticeTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.text },
  noticeText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.grey },
  section: { marginTop: 28, marginBottom: 16, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, color: colors.text },
  fields: { gap: 22 },
  locked: { opacity: 0.5 },
  upload: { gap: 12 },
  side: { fontFamily: fonts.regular, color: colors.grey },
  summary: {
    minHeight: 48,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.stroke,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  summaryAction: { flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: colors.main },
  summaryError: { borderColor: colors.error },
  summaryText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18.48, color: colors.text },
  summaryHint: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12.5, color: colors.main },
  errorGap: { marginTop: 8 },
  footer: { gap: 12 },
  center: { textAlign: 'center' },
});
