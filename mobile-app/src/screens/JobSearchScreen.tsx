import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text, { MAX_FONT_SCALE } from '../components/AppText';
import SelectModal from '../components/SelectModal';
import { navigateTab } from '../components/BottomNav';
import { DarkBackButton, JobCard } from '../components/JobParts';
import { IconFilterOrangeSmall, IconSearchSmall, IconSort } from '../components/JobIcons';
import JobFilterSheet, { DEFAULT_FILTERS, activeFilterCount, type JobFilters } from '../components/JobFilterSheet';
import {
  JOB_SORTS,
  applyState,
  distinct,
  filterJobs,
  useApplyFlow,
  useMyBookings,
  useOpenJobs,
  type JobSort,
} from '../hooks/useJobs';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, layout } from '../theme';
import type { ScreenProps } from '../navigation/types';

/** Search (Figma 197:5486): search box with filters, result count, "Sort by", job cards. */
export default function JobSearchScreen({ navigation }: ScreenProps<'JobSearch'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { jobs, loading } = useOpenJobs(user?.uid);
  const { bookings } = useMyBookings(user?.uid);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<JobSort>('Latest');
  const [sortOpen, setSortOpen] = useState(false);
  const apply = useApplyFlow(bookings, () => navigateTab(navigation, 'home'));

  const shown = useMemo(() => filterJobs(jobs, { filters, bookings, query, sort }), [jobs, filters, bookings, query, sort]);
  const filterCount = activeFilterCount(filters);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.top, { paddingTop: insets.top + 4 }]}>
        <DarkBackButton onPress={() => navigation.goBack()} />
        <View style={[styles.search, focused && styles.searchFocused]}>
          <IconSearchSmall />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search jobs, companies, places"
            placeholderTextColor={colors.grey}
            style={styles.input}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            selectionColor={colors.main}
            cursorColor={colors.main}
            accessibilityLabel="Search jobs"
          />
          <Pressable onPress={() => setFilterOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Filters">
            <IconFilterOrangeSmall />
            {filterCount ? <View style={styles.dot} /> : null}
          </Pressable>
        </View>
      </View>

      <FlatList
        data={shown}
        keyExtractor={(j) => j.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={
          <View style={styles.countRow}>
            <Text style={styles.count}>
              {loading ? 'Searching…' : `${shown.length.toLocaleString()} ${shown.length === 1 ? 'found' : 'founds'}`}
            </Text>
            <Pressable
              onPress={() => setSortOpen(true)}
              style={({ pressed }) => [styles.sort, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${sort}`}
            >
              <IconSort />
              <Text style={styles.sortText}>
                Sort by: <Text style={styles.sortValue}>{sort}</Text>
              </Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.main} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No jobs found</Text>
              <Text style={styles.emptyText}>Try another word or clear the filters.</Text>
            </View>
          )
        }
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
      <SelectModal
        visible={sortOpen}
        title="Sort by"
        options={JOB_SORTS}
        value={sort}
        onSelect={(v) => {
          setSort(v as JobSort);
          setSortOpen(false);
        }}
        onClose={() => setSortOpen(false)}
      />
      {apply.modals}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  // Figma 197:5503: back button + 43pt search box
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 15, paddingHorizontal: layout.gutter },
  search: {
    flex: 1,
    height: 43,
    borderRadius: 12,
    backgroundColor: colors.greyBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 12,
    gap: 13,
    borderWidth: 1,
    borderColor: colors.greyBg,
  },
  searchFocused: { borderColor: colors.main },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, paddingVertical: 0 },
  dot: { position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dark },
  content: { paddingHorizontal: layout.gutter, flexGrow: 1 },
  // Figma 197:5515: "3,779 founds" + Sort by
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 18, height: 35 },
  count: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24.68, letterSpacing: -0.3, color: colors.text },
  sort: {
    height: 35,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  sortText: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24.68, letterSpacing: -0.3, color: colors.grey },
  sortValue: { color: colors.text },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 6 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.grey },
});
