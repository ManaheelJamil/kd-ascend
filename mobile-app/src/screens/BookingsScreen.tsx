import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import BottomNav, { navigateTab } from '../components/BottomNav';
import { IconNavBookings } from '../components/AccountIcons';
import { BookingCard, EmptyState } from '../components/JobParts';
import { useCancelFlow, useMyBookings } from '../hooks/useJobs';
import { useAuth } from '../context/AuthContext';
import {
  bookingState,
  eventStartMs,
  expectedEarnings,
  formatMoney,
  isUpcoming,
  rateLabel,
  type Booking,
} from '../services/jobsService';
import { colors, fonts, layout } from '../theme';
import type { ScreenProps } from '../navigation/types';

type TabKey = 'upcoming' | 'past';

function money(n: number | null, fallback: string) {
  if (n == null) return fallback;
  return n % 1 === 0 ? `$${n}` : formatMoney(n);
}

/** My Bookings (Figma 196:1624 Upcoming, 196:1765 Past). */
export default function BookingsScreen({ navigation, route }: ScreenProps<'Bookings'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bookings, loading, error } = useMyBookings(user?.uid);
  const [tab, setTab] = useState<TabKey>(route.params?.tab ?? 'upcoming');
  const cancel = useCancelFlow();

  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const start = (b: Booking) => eventStartMs(b.job) ?? 0;
    const up = bookings.filter((b) => isUpcoming(b, now)).sort((a, b) => start(a) - start(b)); // next shift first
    const pa = bookings.filter((b) => !isUpcoming(b, now)).sort((a, b) => start(b) - start(a)); // latest first
    return { upcoming: up, past: pa };
  }, [bookings]);

  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: layout.gutter }}>
        <Text style={styles.title}>My Bookings</Text>
        {/* Figma 196:1759 */}
        <View style={styles.tabs} accessibilityRole="tablist">
          {(['upcoming', 'past'] as TabKey[]).map((k) => {
            const on = tab === k;
            const n = k === 'upcoming' ? upcoming.length : past.length;
            return (
              <Pressable
                key={k}
                onPress={() => setTab(k)}
                style={[styles.tab, on && styles.tabOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>
                  {k === 'upcoming' ? 'Upcoming' : 'Past'} ({n})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(b) => b.app.id + b.job.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.main} style={{ marginTop: 60 }} />
          ) : (
            <EmptyState
              icon={<IconNavBookings size={40} color={colors.grey} />}
              title={error ? 'Couldn’t load bookings' : tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
              text={
                error ??
                (tab === 'upcoming' ? 'Jobs you apply for will show up here.' : 'Finished and cancelled bookings show up here.')
              }
              action={
                tab === 'upcoming' && !error ? { label: 'Browse jobs', onPress: () => navigateTab(navigation, 'home') } : undefined
              }
            />
          )
        }
        renderItem={({ item }) => {
          const state = bookingState(item);
          const canCancel = state === 'pending' || state === 'confirmed';
          return (
            <BookingCard
              job={item.job}
              state={state}
              earning={money(expectedEarnings(item.job), rateLabel(item.job.salary).amount)}
              onDetail={() => navigation.navigate('BookingDetail', { jobId: item.job.id })}
              onCancel={canCancel ? () => cancel.start(item) : undefined}
            />
          );
        }}
      />

      <BottomNav active="bookings" onChange={(t) => navigateTab(navigation, t)} />
      {cancel.modal}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 30.8, color: colors.text, textAlign: 'center' },
  tabs: { flexDirection: 'row', justifyContent: 'space-between', gap: 18, marginTop: 22 },
  tab: { flex: 1, height: 45, borderRadius: 8, backgroundColor: colors.greyBg, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.dark },
  tabText: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24.68, letterSpacing: -0.3, color: colors.grey },
  tabTextOn: { color: colors.white },
  content: { paddingHorizontal: layout.gutter, paddingTop: 23, paddingBottom: 24, flexGrow: 1 },
});
