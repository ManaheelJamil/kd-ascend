import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { images } from '../assets';
import { colors, layout } from '../theme';
import BackButton from './BackButton';

type Props = {
  children: React.ReactNode;
  /** Pinned to the bottom of the sheet (pushed down on tall screens, scrolls on short ones). */
  footer?: React.ReactNode;
  /** Shows the white back button over the header (PayNow / Bank screens). */
  onBack?: () => void;
  /** Sheet top padding: 34 for most screens, 30 when a stepper sits at the top. */
  sheetPaddingTop?: number;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Dark doodle header with the logo, and the white rounded sheet every auth screen sits in. */
export default function AuthLayout({ children, footer, onBack, sheetPaddingTop = 34, contentStyle }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={images.doodleHeader} style={styles.doodle} />
        <View style={styles.logoWrap}>
          <Image source={images.logo} style={styles.logo} resizeMode="cover" />
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View style={[styles.sheet, { paddingTop: sheetPaddingTop, paddingBottom: Math.max(insets.bottom, 12) + 24 }]}>
            <View style={contentStyle}>{children}</View>
            {footer ? (
              <>
                <View style={styles.spacer} />
                {footer}
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {onBack ? <BackButton onPress={onBack} style={[styles.back, { top: Math.max(56, insets.top + 8) }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark },
  flex: { flex: 1 },
  // Figma: mask group at x -20, y -92, 791 × 372
  doodle: { position: 'absolute', left: -20, top: -92, width: 791.16, height: 372.24 },
  logoWrap: { position: 'absolute', top: 20, left: 0, right: 0, alignItems: 'center' },
  logo: { width: 250, height: 164.01 },
  scrollContent: { flexGrow: 1, paddingTop: layout.headerHeight },
  sheet: {
    flexGrow: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: layout.sheetRadius,
    borderTopRightRadius: layout.sheetRadius,
    paddingHorizontal: layout.gutter,
  },
  spacer: { flexGrow: 1, minHeight: 32 },
  back: { position: 'absolute', left: 20 },
});
