import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import { navigateTab } from '../components/BottomNav';
import {
  AboutJob,
  CancellationPolicy,
  CorporateCard,
  EventLocation,
  InfoTiles,
  Requirements,
  ScreenHeader,
  SlotChips,
  jobColors,
} from '../components/JobParts';
import { IconArrowRightWhite, TileCalendar, TileClock, TileDollar } from '../components/JobIcons';
import { applyState, useApplyFlow, useMyBookings } from '../hooks/useJobs';
import { useAuth } from '../context/AuthContext';
import {
  expectedEarnings,
  formatMoney,
  rateLabel,
  shortDate,
  subscribeJob,
  timeLabel,
  type Job,
} from '../services/jobsService';
import { colors, fonts, layout } from '../theme';
import type { ScreenProps } from '../navigation/types';

/** Job Detail (Figma 194:944) with Apply For This Job → Confirm Your Booking → Booking Submitted. */
export default function JobDetailScreen({ navigation, route }: ScreenProps<'JobDetail'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { jobId } = route.params;
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const { bookings } = useMyBookings(user?.uid);
  const apply = useApplyFlow(bookings, () => navigateTab(navigation, 'home'));

  useEffect(() => subscribeJob(jobId, setJob, () => setJob(null)), [jobId]);

  const header = (
    <View style={{ paddingTop: insets.top + 9 }}>
      <ScreenHeader title="Job Detail" onBack={() => navigation.goBack()} />
    </View>
  );

  if (job === undefined) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={colors.main} />
        </View>
      </View>
    );
  }
  if (job === null) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.center}>
          <Text style={styles.goneTitle}>This job isn’t available</Text>
          <Text style={styles.goneText}>It may have been removed by the organiser.</Text>
        </View>
      </View>
    );
  }

  const rate = rateLabel(job.salary);
  const earn = expectedEarnings(job);
  const mine = bookings.find((b) => b.job.id === job.id);
  const booked = !!mine && (mine.app.status === 'pending' || mine.app.status === 'approved');
  const st = job.status === 'open' ? applyState(job, bookings) : { label: 'Not Available', disabled: true };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {header}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Figma 305:377: corporate card, role, tiles, chips */}
        <CorporateCard job={job} />
        <View style={{ marginTop: 24, gap: 21 }}>
          <View style={{ gap: 18 }}>
            <Text style={styles.role}>{job.title}</Text>
            <InfoTiles
              items={[
                { icon: <TileCalendar />, label: 'Event Date', value: shortDate(job.eventDate) },
                { icon: <TileClock />, label: 'Event Time', value: timeLabel(job.eventTime) },
                { icon: <TileDollar />, label: 'Rate', value: `${rate.amount}${rate.unit ? '/hour' : ''}` },
              ]}
            />
          </View>
          <SlotChips job={job} />
        </View>

        <View style={styles.section}>
          <AboutJob description={job.description} />
        </View>
        <View style={[styles.section, { gap: 24 }]}>
          <Requirements items={job.requirements} />
          <CancellationPolicy />
        </View>
        <View style={styles.section}>
          <EventLocation address={job.location} />
        </View>
      </ScrollView>

      {/* Figma 194:1062: Expected Earnings + Apply For This Job */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 14) + 12 }]}>
        <View style={{ gap: 4 }}>
          <Text style={styles.earnLabel}>Expected Earnings</Text>
          <Text style={styles.earn}>{earn != null ? formatMoney(earn) : rate.amount}</Text>
        </View>
        {booked ? (
          <Pressable
            onPress={() => navigation.navigate('BookingDetail', { jobId: job.id })}
            style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Text style={styles.applyText}>View Booking</Text>
            <IconArrowRightWhite />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => apply.start(job)}
            disabled={st.disabled}
            style={({ pressed }) => [
              styles.applyBtn,
              st.disabled && { backgroundColor: jobColors.field },
              pressed && !st.disabled && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: st.disabled }}
          >
            <Text style={[styles.applyText, st.disabled && { color: colors.grey }]}>
              {st.disabled ? st.label : 'Apply For This Job'}
            </Text>
            {st.disabled ? null : <IconArrowRightWhite />}
          </Pressable>
        )}
      </View>
      {apply.modals}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  goneTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  goneText: { fontFamily: fonts.regular, fontSize: 14, color: colors.grey, textAlign: 'center' },
  content: { paddingHorizontal: layout.gutter, paddingTop: 40, paddingBottom: 30 },
  role: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24.68, letterSpacing: -0.3, color: colors.text },
  section: { marginTop: 24 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingTop: 19,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -10 },
    elevation: 12,
  },
  earnLabel: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 21.65, letterSpacing: -0.26, color: colors.grey },
  earn: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 21.65 + 4, letterSpacing: -0.26, color: colors.text },
  applyBtn: {
    width: 195,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  applyText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
});
