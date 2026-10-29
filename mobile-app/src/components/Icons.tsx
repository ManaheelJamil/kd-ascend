/**
 * Small wrappers that place the Figma SVGs exactly the way the frames do
 * (some icons are a group inset inside a 24pt box, some are flipped).
 */
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Svg } from '../assets';

/** 12pt arrow drawn on a 0-height line (Figma "Arrow 4"). `dark` + `left` = Back button arrow. */
export function ArrowIcon({ dark = false, left = false }: { dark?: boolean; left?: boolean }) {
  const Icon = dark ? Svg.IconArrowDark : Svg.IconArrowRight;
  return (
    <View style={[styles.arrowBox, left && styles.flipX]}>
      <View style={styles.arrowSvg}>
        <Icon />
      </View>
    </View>
  );
}

/** mage:email — group inset 14.58% / 11.74% / 14.58% / 11.17% in a 24pt box. */
export function EmailIcon() {
  return (
    <View style={styles.box24}>
      <View style={{ position: 'absolute', left: 1.93, top: 2.75 }}>
        <Svg.IconEmail />
      </View>
    </View>
  );
}

/** mingcute:bank-card-fill — group inset 16.67% / 8.33% / 0.78% / 8.33%. */
export function BankIcon() {
  return (
    <View style={styles.box24}>
      <View style={{ position: 'absolute', left: 2, top: 4 }}>
        <Svg.IconBank />
      </View>
    </View>
  );
}

/** solar:calendar-linear — 22pt box, group inset 10.42% / 8.33% / 8.33% / 8.33%. */
export function CalendarIcon() {
  return (
    <View style={styles.box22}>
      <View style={{ position: 'absolute', left: 1.08, top: 1.54 }}>
        <Svg.IconCalendar />
      </View>
    </View>
  );
}

/** Button icons are vertically flipped in the frames (-scale-y-100). */
export function FlippedY({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.flipY, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  arrowBox: { width: 12, height: 12, justifyContent: 'center' },
  // inset -5.89px -6.67% around a 12 × 0 line, centred vertically in the 12pt box
  arrowSvg: { position: 'absolute', left: -0.8, top: 0.11 },
  flipX: { transform: [{ scaleX: -1 }] },
  flipY: { transform: [{ scaleY: -1 }] },
  box24: { width: 24, height: 24 },
  box22: { width: 22, height: 22 },
});
