import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNav, { navigateTab } from '../components/BottomNav';
import { IconNavBookings } from '../components/AccountIcons';
import { IconBell, IconFilterWhite, IconSearch, IconVerified } from '../components/JobIcons';
import { EmptyState, JobCard } from '../components/JobParts';
import JobFilterSheet, { DEFAULT_FILTERS, activeFilterCount, type JobFilters } from '../components/JobFilterSheet';
import { applyState, distinct, filterJobs, useApplyFlow, useMyBookings, useOpenJobs } from '../hooks/useJobs';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { initials } from '../utils/format';
import { colors, fonts, layout } from '../theme';
import type { ScreenProps } from '../navigation/types';

/**
 * Home (Figma "Verified" 193:550): greeting, "Available Jobs" with search and filters,
 * live list of open jobs, Apply → Confirm Your Booking → Booking Submitted.
 */
export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  const uid = user?.uid;
  const name = profile?.profile?.fullName || user?.email?.split('@')[0] || '';

  const { jobs, loading, error } = useOpenJobs(uid);
  const { bookings } = useMyBookings(uid);
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const apply = useApplyFlow(bookings, () => undefined);
  const { unread } = useNotifications();
  // After Edit Profile / a new document the account is back under review: jobs are paused until approved.
  const reviewing = !!error && profile?.status === 'under_review';

  const shown = useMemo(() => filterJobs(jobs, { filters, bookings }), [jobs, filters, bookings]);
  const filterCount = activeFilterCount(filters);

  const header = (
    <View>
      <View style={styles.greetingRow}>
        <View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <View style={styles.verified} accessibilityLabel="Verified">
            <IconVerified />
          </View>
        </View>
        <Text style={styles.hello} numberOfLines={1}>
          Hey, {name}
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Notifications')}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={unread ? `Notifications, ${unread} new` : 'Notifications'}
        >
          <IconBell dot={unread > 0} />
        </Pressable>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.heading}>
          Available <Text style={styles.headingBold}>Jobs</Text>
        </Text>
        <Pressable
          onPress={() => navigation.navigate('JobSearch')}
          style={({ pressed }) => [styles.roundBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Search jobs"
        >
          <IconSearch />
        </Pressable>
        <Pressable
          onPress={() => setFilterOpen(true)}
          style={({ pressed }) => [styles.roundBtn, styles.filterBtn, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel={filterCount ? `Filters, ${filterCount} on` : 'Filters'}
        >
          <IconFilterWhite />
          {filterCount ? (
            <View style={styles.filterCount}>
              <Text style={styles.filterCountText}>{filterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );

  const empty = loading ? (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.main} />
    </View>
  ) : (
    <EmptyState
      icon={<IconNavBookings size={40} color={colors.grey} />}
      title={reviewing ? 'Profile under review' : error ? 'Couldn’t load jobs' : filterCount ? 'No matching jobs' : 'No jobs yet'}
      text={
        (reviewing
          ? 'You updated your profile, so the admin is checking it again. You can book jobs once it is approved.'
          : error) ??
        (filterCount ? 'Try changing or clearing your filters.' : 'New jobs will show up here as soon as they’re available.')
      }
      action={filterCount && !error ? { label: 'Clear filters', onPress: () => setFilters(DEFAULT_FILTERS) } : undefined}
    />
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <FlatList
        data={shown}
        keyExtractor={(j) => j.id}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
        renderItem={({ item }) => {
          const st = applyState(item, bookings);
          return (
            <JobCard
              job={item}
              onDetail={() => navigation.navigate('JobDetail', { jobId: item.id })}
              actionLabel={st.label}
              actionDisabled={st.disabled}
              onAction={() => apply.start(item)}
            />
          );
        }}
      />

      <BottomNav active="home" onChange={(t) => navigateTab(navigation, t)} />

      <JobFilterSheet
        visible={filterOpen}
        value={filters}
        companies={distinct(jobs.map((j) => j.corporateName))}
        roles={distinct(jobs.map((j) => j.title))}
        onApply={(f) => {
          setFilters(f);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
      {apply.modals}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: layout.gutter, paddingBottom: 24, flexGrow: 1 },
  // Figma 224:164: avatar 44 + name, bell 44 on the right
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  verified: { position: 'absolute', left: 30, top: -0.87 },
  hello: { flex: 1, fontFamily: fonts.bold, fontSize: 16, lineHeight: 24.68, letterSpacing: -0.3, color: colors.text },
  // Figma 193:688: "Available Jobs" 28 / 35, two 50pt round buttons, 13 apart
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 11, marginBottom: 11, height: 50 },
  heading: { flex: 1, fontFamily: fonts.regular, fontSize: 28, lineHeight: 35, color: colors.text },
  headingBold: { fontFamily: fonts.bold },
  roundBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.greyBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtn: { backgroundColor: colors.main },
  filterCount: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCountText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.white },
  loading: { paddingVertical: 80, alignItems: 'center' },
});
