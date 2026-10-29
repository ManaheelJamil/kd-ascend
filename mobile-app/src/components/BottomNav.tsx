import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconNavAccount, IconNavBookings, IconNavEarnings, IconNavHome } from './AccountIcons';
import { colors, fonts } from '../theme';

export type Tab = 'home' | 'bookings' | 'earnings' | 'account';

const TABS: { key: Tab; label: string; Icon: (p: { color?: string }) => React.ReactElement }[] = [
  { key: 'home', label: 'Home', Icon: IconNavHome },
  { key: 'bookings', label: 'Bookings', Icon: IconNavBookings },
  { key: 'earnings', label: 'Earnings', Icon: IconNavEarnings },
  { key: 'account', label: 'Account', Icon: IconNavAccount },
];

/**
 * Figma "Footer Final": Home · Bookings · Earnings · Account, active tab in orange.
 * Bookings and Earnings aren't built yet, so they show a short "coming soon" note.
 */
export default function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const insets = useSafeAreaInsets();

  const press = (tab: Tab) => {
    if (tab === active) return;
    if (tab === 'bookings' || tab === 'earnings') {
      Alert.alert('Coming soon', `${tab === 'bookings' ? 'Bookings' : 'Earnings'} will be available in a future update.`);
      return;
    }
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
