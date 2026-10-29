import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Svg } from '../assets';
import { colors } from '../theme';

/** White 32pt back button shown over the header (Figma "weui:back-filled"). */
export default function BackButton({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }, style]}
    >
      <Svg.IconBack />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 32,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
