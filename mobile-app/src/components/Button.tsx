import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Text from './AppText';
import { colors, fonts, layout } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Button({ title, onPress, variant = 'primary', loading, disabled, left, right, style }: Props) {
  const outline = variant === 'outline';
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        outline ? styles.outline : styles.primary,
        pressed && !inactive && { opacity: 0.85 },
        disabled && !loading && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.dark : colors.white} />
      ) : (
        <View style={styles.row}>
          {left}
          {/* Fixed size: on Android the phone's font-size setting made the label draw wider than
              it was measured, so the arrow sat on top of the last letter ("Go To Log→n"). */}
          <Text style={[styles.label, outline && { color: colors.text }]} allowFontScaling={false} textBreakStrategy="simple">
            {title}
          </Text>
          {right}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: layout.radius,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.main },
  outline: { borderWidth: 1, borderColor: colors.dark, backgroundColor: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: '100%' },
  label: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.white, includeFontPadding: false, paddingHorizontal: 1, textAlign: 'center' },
});
