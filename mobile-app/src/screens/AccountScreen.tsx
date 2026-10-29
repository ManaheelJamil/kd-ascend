import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AccountLayout from '../components/AccountLayout';
import BottomNav from '../components/BottomNav';
import {
  // DEV BRANCH (Account section off): IconBell, IconCard, IconChevronRight, IconDocument, IconHelp, IconPerson,
  IconLogout,
} from '../components/AccountIcons';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/authService';
import { initials } from '../utils/format';
import { colors, fonts, layout } from '../theme';
import type { ScreenProps } from '../navigation/types';

// DEV BRANCH (Account section off): the menu rows below are switched off; only Logout stays.
// type Row = {
//   label: string;
//   Icon: (p: { color?: string }) => React.ReactElement;
//   route?: keyof RootStackParamList;
// };

// const ROWS: Row[] = [
//   { label: 'Edit Profile', Icon: IconPerson, route: 'EditProfile' },
//   { label: 'Identity Documents', Icon: IconDocument, route: 'IdentityDocuments' },
//   { label: 'Payment Details', Icon: IconCard, route: 'PaymentDetails' },
//   // Not part of this module yet.
//   { label: 'Notification Settings', Icon: IconBell },
//   { label: 'Help & Support', Icon: IconHelp },
// ];

/** Figma "Account" (196:4670). */
export default function AccountScreen({ navigation }: ScreenProps<'Account'>) {
  const { user, profile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const name = profile?.profile?.fullName || user?.email?.split('@')[0] || '';
  const email = user?.email ?? profile?.email ?? '';
  const verified = profile?.status === 'approved';

  // const open = (row: Row) => {
  //   if (row.route) navigation.navigate(row.route as never);
  //   else Alert.alert('Coming soon', `${row.label} will be available in a future update.`);
  // };

  const logout = () =>
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut(); // the navigator switches to Login
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);

  return (
    <AccountLayout
      title="Account"
      contentTop={20}
      bottomNav={<BottomNav active="account" onChange={(t) => t === 'home' && navigation.navigate('Home')} />}
    >
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
        <View style={styles.cardTexts}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
        </View>
        <View style={[styles.badge, !verified && styles.badgePending]}>
          <View style={[styles.dot, !verified && styles.dotPending]} />
          <Text style={[styles.badgeText, !verified && styles.badgeTextPending]}>
            {verified ? 'Verified' : 'Unverified'}
          </Text>
        </View>
      </View>

      {/* DEV BRANCH (Account section off): Edit Profile, Identity Documents, Payment Details,
          Notification Settings and Help & Support rows.
      <View style={styles.list}>
        {ROWS.map((row, i) => (
          <View key={row.label}>
            {i > 0 ? <View style={styles.line} /> : null}
            <Pressable
              onPress={() => open(row)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={row.label}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <row.Icon color={colors.dark} />
                </View>
                <Text style={styles.rowText}>{row.label}</Text>
              </View>
              <IconChevronRight />
            </Pressable>
          </View>
        ))}
      </View>
      */}

      <Pressable
        onPress={logout}
        disabled={signingOut}
        style={({ pressed }) => [styles.logout, (pressed || signingOut) && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel="Logout"
      >
        <IconLogout />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </AccountLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 81,
    borderRadius: 14,
    backgroundColor: colors.dark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  cardTexts: { flex: 1 },
  name: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 25, color: colors.white },
  email: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 25, color: 'rgba(246,246,246,0.7)' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 27,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(165,255,114,0.24)',
  },
  badgePending: { backgroundColor: 'rgba(255,130,65,0.22)' },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#70EA7F' },
  dotPending: { backgroundColor: colors.main },
  badgeText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 20, color: '#70EA7F' },
  badgeTextPending: { color: '#FFB48C' },
  list: { marginTop: 43 },
  line: { height: 1, backgroundColor: 'rgba(224,224,224,0.52)', marginVertical: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.greyBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 25, color: colors.text },
  logout: {
    marginTop: 29,
    height: 45,
    borderRadius: layout.radius,
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 25, color: colors.white },
});
