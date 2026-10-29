import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, fonts, layout } from '../theme';

/** Navy 32pt back button used on the Account screens (Figma "Frame 1618876505"). */
export function NavyBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
        <Rect width={32} height={32} rx={8} fill={colors.dark} />
        <Path
          d="M13.3435 15.9996L20.4145 23.0706L19.0005 24.4846L11.2225 16.7066C11.035 16.5191 10.9297 16.2648 10.9297 15.9996C10.9297 15.7345 11.035 15.4802 11.2225 15.2926L19.0005 7.51465L20.4145 8.92865L13.3435 15.9996Z"
          fillRule="evenodd"
          clipRule="evenodd"
          fill={colors.white}
        />
      </Svg>
    </Pressable>
  );
}

/** Centred 22pt title with an optional back button on the left. */
export function ScreenTitle({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{onBack ? <NavyBackButton onPress={onBack} /> : null}</View>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.headerSide} />
    </View>
  );
}

type Props = {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
  /** Pinned at the bottom (e.g. the orange Save / Submit button). */
  footer?: React.ReactNode;
  /** Bottom tab bar (Home / Account). Replaces the safe-area padding at the bottom. */
  bottomNav?: React.ReactNode;
  scroll?: boolean;
  /** Space between the title and the content (Figma: 45 on forms, 39 on lists). */
  contentTop?: number;
};

/** White Account-section screen: title row, content, optional pinned footer / tab bar. */
export default function AccountLayout({ title, onBack, children, footer, bottomNav, scroll = true, contentTop = 39 }: Props) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: contentTop }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, { paddingTop: contentTop }]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + 12 }}>
        <ScreenTitle title={title} onBack={onBack} />
      </View>
      {body}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: bottomNav ? 16 : Math.max(insets.bottom, 16) + 12 }]}>{footer}</View>
      ) : null}
      {bottomNav}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  header: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
  },
  headerSide: { width: 44, alignItems: 'flex-start' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 30.8,
    color: colors.text,
  },
  content: { paddingHorizontal: layout.gutter, paddingBottom: 24 },
  footer: { paddingHorizontal: layout.gutter, paddingTop: 12, backgroundColor: colors.white },
});
