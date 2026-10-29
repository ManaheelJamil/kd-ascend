import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNav from '../components/BottomNav';
import { IconNavBookings } from '../components/AccountIcons';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/format';
import { colors, fonts, layout } from '../theme';
import type { ScreenProps } from '../navigation/types';

/**
 * Home (Figma "Verified" 193:550): greeting, "Available Jobs" and the bottom tab bar.
 * The job list belongs to the Jobs module and isn't built yet, so an empty state is shown.
 */
export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  const name = profile?.profile?.fullName || user?.email?.split('@')[0] || '';

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <View style={styles.greetingRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <Text style={styles.hello} numberOfLines={1}>
            Hey, {name}
          </Text>
        </View>

        <Text style={styles.heading}>
          Available <Text style={styles.headingBold}>Jobs</Text>
        </Text>

        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <IconNavBookings size={40} color={colors.grey} />
          </View>
          <Text style={styles.emptyTitle}>No jobs yet</Text>
          <Text style={styles.emptyText}>New jobs will show up here as soon as they’re available.</Text>
        </View>
      </ScrollView>

      <BottomNav active="home" onChange={(t) => t === 'account' && navigation.navigate('Account')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: layout.gutter, paddingBottom: 24, flexGrow: 1 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  hello: { flex: 1, fontFamily: fonts.bold, fontSize: 16, lineHeight: 25, color: colors.text },
  heading: { marginTop: 22, fontFamily: fonts.regular, fontSize: 28, lineHeight: 36, color: colors.text },
  headingBold: { fontFamily: fonts.semibold },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 8 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.greyBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 25, color: colors.text },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.grey, textAlign: 'center', maxWidth: 280 },
});
