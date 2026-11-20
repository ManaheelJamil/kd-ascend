import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import {
  AboutJob,
  CancellationPolicy,
  CorporateCard,
  EventLocation,
  InfoGrid,
  InfoTiles,
  PaymentMethodRow,
  Requirements,
  ScreenHeader,
  SectionTitle,
  StatusBadge,
} from '../components/JobParts';
import { IconCopy, TileCalendar, TileClock, TileClockTight, TileDollar } from '../components/JobIcons';
import { useCancelFlow, useMyBookings } from '../hooks/useJobs';
import { useAuth } from '../context/AuthContext';
import {
  bookingCode,
  bookingState,
  expectedEarnings,
  formatMoney,
  rateLabel,
  shortDate,
  subscribeMyPayments,
  timeLabel,
  type PaymentTransaction,
} from '../services/jobsService';
import { colors, fonts, layout } from '../theme';
import type { ScreenProps } from '../navigation/types';

function money(n: number) {
  return n % 1 === 0 ? `$${n}` : formatMoney(n);
}

/**
 * Booking page: Figma "confirmed job" (196:1989) with Cancel Booking (308:491),
 * and "Completed job" (196:2272) with the final earnings once the admin has paid out.
 */
export default function BookingDetailScreen({ navigation, route }: ScreenProps<'BookingDetail'>) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { jobId } = route.params;
  const { bookings, loading } = useMyBookings(user?.uid);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const cancel = useCancelFlow();

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeMyPayments(user.uid, setPayments, () => undefined);
  }, [user?.uid]);

  const booking = useMemo(() => bookings.find((b) => b.job.id === jobId) ?? null, [bookings, jobId]);
  const payout = payments.find((p) => p.jobId === jobId && p.type === 'payout' && p.status !== 'failed');
  const penalty = payments.find((p) => p.jobId === jobId && p.type === 'penalty' && p.status !== 'failed');

  if (!booking) {
    return (
      <View style={styles.root}>
        <View style={{ paddingTop: insets.top + 9 }}>
          <ScreenHeader title="Booking" onBack={() => navigation.goBack()} />
        </View>
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator color={colors.main} />
          ) : (
            <>
              <Text style={styles.goneTitle}>Booking not found</Text>
              <Text style={styles.goneText}>This booking may have been removed.</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const { job } = booking;
  const state = bookingState(booking);
  const code = bookingCode(booking);
  const rate = rateLabel(job.salary);
  const rateText = `${rate.amount}${rate.unit ? '/hour' : ''}`;
  const earn = expectedEarnings(job);
  const canCancel = state === 'pending' || state === 'confirmed';
  const completed = state === 'completed';
  const method =
    profile?.payout?.method === 'bank'
      ? 'Bank Transfer'
      : profile?.payout?.method === 'paynow'
        ? 'PayNow'
        : payout?.method || '—';

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + 9 }}>
        <ScreenHeader
          small
          title={`Booking ID: ${code}`}
          onBack={() => navigation.goBack()}
          right={
            <Pressable
              onPress={() => void Share.share({ message: `Booking ID: ${code}` })}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Copy booking ID"
            >
              <IconCopy />
            </Pressable>
          }
        />
      </View>

      <ScrollView contentContainerStyle={[styles.content, !canCancel && { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <CorporateCard job={job} subtitle="role" badge={<StatusBadge state={state} detail />} />

        {completed ? (
          <View style={[styles.firstSection, { gap: 18 }]}>
            <SectionTitle>Final Schedule &amp; Earnings</SectionTitle>
            <InfoGrid
              items={[
                { icon: <TileCalendar />, label: 'Date', value: shortDate(job.eventDate) },
                { icon: <TileClockTight />, label: 'Time', value: timeLabel(job.eventTime) },
                {
                  icon: <TileDollar />,
                  label: 'Earnings',
                  value: payout
                    ? `${money(payout.amount)} (${money(payout.hourlyRate)}/hour)`
                    : earn != null
                      ? `${money(earn)} (${rateText})`
                      : rateText,
                },
                { icon: <TileDollar />, label: 'Bonus', value: money(payout?.bonus ?? 0) },
              ]}
            />
            {!payout ? <Text style={styles.info}>Your final earnings will show here once the admin processes the payout.</Text> : null}
            {payout && payout.deduction > 0 ? (
              <Text style={[styles.info, { color: colors.error }]}>
                Deduction: -{money(payout.deduction)}
                {payout.note ? ` · ${payout.note}` : ''}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={[styles.firstSection, { gap: 18 }]}>
            <SectionTitle>Schedule &amp; Earnings</SectionTitle>
            <InfoTiles
              items={[
                { icon: <TileCalendar />, label: 'Date', value: shortDate(job.eventDate) },
                { icon: <TileClock />, label: 'Time', value: timeLabel(job.eventTime) },
                { icon: <TileDollar />, label: 'Earnings', value: earn != null ? `${money(earn)} (${rateText})` : rateText },
              ]}
            />
          </View>
        )}

        {state === 'pending' ? (
          <Text style={styles.info}>Waiting for the admin to approve your booking. You’ll see “Confirmed” here once approved.</Text>
        ) : state === 'rejected' ? (
          <Text style={styles.info}>Your booking was unsuccessful. Please make another booking!</Text>
        ) : state === 'job_cancelled' ? (
          <Text style={[styles.info, { color: colors.error }]}>The organiser cancelled this job.</Text>
        ) : state === 'cancelled' ? (
          <Text style={[styles.info, { color: colors.error }]}>
            You cancelled this booking.
            {penalty ? ` A late-cancellation penalty of ${money(penalty.amount)} applies.` : ''}
          </Text>
        ) : null}

        <View style={styles.section}>
          <AboutJob description={job.description} />
        </View>
        <View style={[styles.section, { gap: 24 }]}>
          <Requirements items={job.requirements} />
          {canCancel ? <CancellationPolicy /> : null}
        </View>
        <View style={styles.section}>
          <EventLocation address={job.location} />
        </View>
        <View style={{ marginTop: 23 }}>
          <PaymentMethodRow method={method} />
        </View>
      </ScrollView>

      {canCancel ? (
        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
          <Pressable
            onPress={() => cancel.start(booking)}
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Cancel Booking</Text>
          </Pressable>
        </View>
      ) : null}
      {cancel.modal}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  goneTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  goneText: { fontFamily: fonts.regular, fontSize: 14, color: colors.grey, textAlign: 'center' },
  content: { paddingHorizontal: layout.gutter, paddingTop: 22, paddingBottom: 24 },
  firstSection: { marginTop: 24 },
  section: { marginTop: 24 },
  info: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.grey, marginTop: 14 },
  bottom: { paddingHorizontal: layout.gutter, paddingTop: 10, backgroundColor: colors.white },
  cancelBtn: { height: 50, borderRadius: 12, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
});
