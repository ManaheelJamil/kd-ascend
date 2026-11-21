import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconNavAccount, IconNavBookings, IconNavEarnings, IconNavHome } from './AccountIcons';
import { colors, fonts } from '../theme';

export type Tab = 'home' | 'bookings' | 'earnings' | 'account';

const TAB_ROUTE = { home: 'Home', bookings: 'Bookings', earnings: 'Earnings', account: 'Account' } as const;

/**
 * Switch to a tab's screen. The stack is reset to that one screen, so moving between tabs
 * never piles screens up (and Back on Android leaves the app from a tab, as expected).
 */
export function navigateTab(
  navigation: { reset: (state: { index: number; routes: { name: never }[] }) => void },
  tab: Tab,
) {
  navigation.reset({ index: 0, routes: [{ name: TAB_ROUTE[tab] as never }] });
}

const TABS: { key: Tab; label: string; Icon: (p: { color?: string }) => React.ReactElement }[] = [
  { key: 'home', label: 'Home', Icon: IconNavHome },
  { key: 'bookings', label: 'Bookings', Icon: IconNavBookings },
  { key: 'earnings', label: 'Earnings', Icon: IconNavEarnings },
  { key: 'account', label: 'Account', Icon: IconNavAccount },
];

/**
 * Figma "Footer Final": Home · Bookings · Earnings · Account, active tab in orange.
 */
export default function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const insets = useSafeAreaInsets();

  const press = (tab: Tab) => {
    if (tab === active) return;
    onChange(tab);
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]} accessibilityRole="tablist">
      {TABS.map(({ key, label, Icon }) => {
        const on = key === active;
        const color = on ? colors.main : colors.grey;
        return (
          <Pressable
            key={key}
            onPress={() => press(key)}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
            hitSlop={6}
          >
            <Icon color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 21,
    paddingTop: 11,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  tab: { alignItems: 'center', minWidth: 58 },
  label: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 25 },
});
