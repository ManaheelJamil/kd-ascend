import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';

/**
 * Largest text size multiplier the app follows from the phone's "Font size" setting.
 * Bigger system fonts still make text larger, but only up to 115%, so labels, buttons and
 * fields keep their layout instead of overlapping or getting cut off.
 */
export const MAX_FONT_SCALE = 1.15;

/** Drop-in replacement for React Native's Text with the font-scale cap above. */
export default function Text(props: TextProps & { ref?: React.Ref<RNText> }) {
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
}
