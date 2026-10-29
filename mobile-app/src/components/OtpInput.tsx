import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme';

type Props = {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
};

export type OtpInputHandle = { focus: () => void };

/** Six 55 × 63 boxes backed by one hidden input (supports paste and SMS autofill). */
const OtpInput = forwardRef<OtpInputHandle, Props>(function OtpInput(
  { value, onChange, onComplete, length = 6, error, disabled, autoFocus = true },
  ref,
) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()} disabled={disabled} accessibilityLabel="Verification code">
      <View style={styles.row}>
        {Array.from({ length }).map((_, i) => {
          const digit = value[i] ?? '';
          const active = focused && !error && (i === value.length || (i === length - 1 && value.length === length));
          return (
            <View key={i} style={[styles.box, active && styles.boxActive, error && styles.boxError]}>
              <Text style={[styles.digit, error && styles.digitError]}>{digit}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
});

export default OtpInput;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 11 },
  box: {
    flex: 1,
    maxWidth: 56,
    aspectRatio: 55 / 63,
    borderWidth: 1,
    borderColor: colors.otpBorder,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.main },
  boxError: { borderColor: colors.otpErrorBorder },
  digit: { fontFamily: fonts.regular, fontSize: 24, lineHeight: 31.68, color: colors.grey },
  digitError: { color: colors.error },
  hidden: { ...StyleSheet.absoluteFillObject, opacity: 0, color: 'transparent' },
});
