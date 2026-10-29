import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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
          <Text style={[styles.label, outline && { color: colors.text }]} numberOfLines={1}>
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
    height: 50,
    borderRadius: layout.radius,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.main },
  outline: { borderWidth: 1, borderColor: colors.dark, backgroundColor: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white, textTransform: 'capitalize' },
});
