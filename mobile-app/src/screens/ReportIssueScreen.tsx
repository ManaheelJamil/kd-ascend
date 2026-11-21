import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import Text, { MAX_FONT_SCALE } from '../components/AppText';
import AccountLayout from '../components/AccountLayout';
import TextField from '../components/TextField';
import Button from '../components/Button';
import SelectModal from '../components/SelectModal';
import { InfoBanner } from './ContactAdminScreen';
import { Svg } from '../assets';
import { ISSUE_TYPES, reportIssue, type IssueType } from '../services/supportService';
import { friendlyError } from '../services/errors';
import { colors, fonts, text } from '../theme';
import type { ScreenProps } from '../navigation/types';

const MIN = 10;
const MAX = 2000;

/** Report an Issue (Figma 196:5071): the report is saved for the admin and emailed to support. */
export default function ReportIssueScreen({ navigation }: ScreenProps<'ReportIssue'>) {
  const [type, setType] = useState<IssueType | null>(null);
  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [errors, setErrors] = useState<{ type?: string | null; message?: string | null; form?: string | null }>({});
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const trimmed = message.trim();
    const next = {
      type: type ? null : 'Please choose the issue type.',
      message:
        trimmed.length < MIN ? `Please describe the issue (at least ${MIN} characters).` : null,
    };
    setErrors(next);
    if (next.type || next.message || !type) return;
    setSending(true);
    try {
      await reportIssue(type, trimmed);
      Alert.alert('Report sent', 'Thanks for letting us know. Our team will review your issue and get back to you.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setErrors({ form: friendlyError(e, 'We couldn’t send your report. Please check your connection and try again.') });
    } finally {
      setSending(false);
    }
  };

  return (
    <AccountLayout
      title="Report an Issue"
      onBack={() => navigation.goBack()}
      contentTop={30}
      footer={
        <View style={{ gap: 12 }}>
          {errors.form ? <Text style={[text.fieldError, { textAlign: 'center' }]}>{errors.form}</Text> : null}
          <Button title="Submit Report" onPress={submit} loading={sending} />
        </View>
      }
    >
      <InfoBanner
        title="Please let us know what went wrong."
        text="Our team will review your issue and get back to you."
      />
      <View style={styles.body}>
        <TextField
          label="Issue Type"
          placeholder="Select"
          value={type ?? ''}
          onPressField={() => setSelectOpen(true)}
          right={<Svg.IconChevronDown />}
          error={errors.type}
        />
        <View style={{ gap: 12 }}>
          <Text style={text.label}>Describe the issue</Text>
          <TextInput
            value={message}
            onChangeText={(v) => {
              setMessage(v.slice(0, MAX));
              if (errors.message) setErrors((e) => ({ ...e, message: null }));
            }}
            placeholder="Briefly explain the problem you are facing..."
            placeholderTextColor={colors.grey}
            multiline
            textAlignVertical="top"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            selectionColor={colors.main}
            accessibilityLabel="Describe the issue"
            style={[
              styles.area,
              focused && { borderColor: colors.main },
              !!errors.message && { borderColor: colors.error, backgroundColor: colors.errorBg },
            ]}
          />
          <View style={styles.areaFoot}>
            {errors.message ? <Text style={[text.fieldError, { flex: 1 }]}>{errors.message}</Text> : <View style={{ flex: 1 }} />}
            <Text style={styles.count}>
              {message.length}/{MAX}
            </Text>
          </View>
        </View>
      </View>

      <SelectModal
        visible={selectOpen}
        title="Issue Type"
        options={ISSUE_TYPES}
        value={type}
        onClose={() => setSelectOpen(false)}
        onSelect={(v) => {
          setType(v as IssueType);
          setErrors((e) => ({ ...e, type: null }));
          setSelectOpen(false);
        }}
      />
    </AccountLayout>
  );
}

const styles = StyleSheet.create({
  body: { gap: 22, marginTop: 26 },
  area: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  areaFoot: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: -4 },
  count: { fontFamily: fonts.regular, fontSize: 12, color: colors.grey },
});
