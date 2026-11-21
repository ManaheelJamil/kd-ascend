import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, Share, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import BottomNav, { navigateTab } from '../components/BottomNav';
import EarningsFilterSheet from '../components/EarningsFilterSheet';
import { EmptyState } from '../components/JobParts';
import { IconNavEarnings } from '../components/AccountIcons';
import { EarnSvg, JobSvg, earnImages } from '../assets';
import { useAuth } from '../context/AuthContext';
import { useMyBookings } from '../hooks/useJobs';
import { subscribeMyPayments, type PaymentTransaction } from '../services/jobsService';
import {
  DEFAULT_EARNINGS_FILTERS,
  applyEarningsFilters,
  buildRows,
  cardDate,
  money,
  payslipText,
  rangeLabel,
  shiftLine,
  totals,
  type EarningRow,
  type EarningsFilters,
  type TxnLabel,
} from '../services/earningsService';
import { colors, fonts, layout } from '../theme';
import type { ScreenProps } from '../navigation/types';

const PREVIEW = 3;

const STATUS: Record<TxnLabel, { bg: string; fg: string; dateLabel: string }> = {
  Paid: { bg: 'rgba(165,255,114,0.24)', fg: '#20AA30', dateLabel: 'Paid On:' },
  Deducted: { bg: '#FFF2F2', fg: colors.error, dateLabel: 'Deduct On:' },
  Processing: { bg: 'rgba(107,176,240,0.16)', fg: '#0566C0', dateLabel: 'Verified On:' },
  Pending: { bg: 'rgba(255,130,65,0.12)', fg: colors.main, dateLabel: 'Worked On:' },
};

/** One transaction (Figma 239:1218). */
function TxnCard({ row }: { row: EarningRow }) {
  const s = STATUS[row.label];
  return (
    <View style={styles.card}>
      <View style={styles.idTag}>
        <Text style={styles.idText}>ID #{row.reference}</Text>
      </View>
      <View style={styles.cardRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.company} numberOfLines={1}>
            {row.job?.corporateName ?? row.txn.jobIdLabel}
          </Text>
          <Text style={styles.role} numberOfLines={1}>
            {row.txn.type === 'penalty' ? 'Late cancellation' : (row.job?.title ?? 'Job payout')}
          </Text>
        </View>
        <View style={styles.amount}>
          <Text style={styles.amountText}>{money(row.signed)}</Text>
        </View>
      </View>
      <View style={styles.shift}>
        <EarnSvg.Calendar />
        <Text style={styles.shiftText} numberOfLines={1}>
          {shiftLine(row)}
        </Text>
      </View>
      <View style={styles.rule} />
      <View style={styles.cardRow}>
        <Text style={styles.on}>
          {s.dateLabel} <Text style={styles.onDate}>{row.dateMs ? cardDate(row.dateMs) : '—'}</Text>
        </Text>
        <View style={[styles.status, { backgroundColor: s.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: s.fg }]} />
          <Text style={[styles.statusText, { color: s.fg }]}>{row.label}</Text>
        </View>
      </View>
    </View>
  );
}

/** Earnings (Figma 196:4501) with its filter sheet (196:4759). */
export default function EarningsScreen({ navigation }: ScreenProps<'Earnings'>) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const uid = user?.uid;
  const { bookings } = useMyBookings(uid);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EarningsFilters>(DEFAULT_EARNINGS_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return subscribeMyPayments(
      uid,
      (rows) => {
        setPayments(rows);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError('We couldn’t load your earnings. Check your connection and try again.');
      },
      true,
    );
  }, [uid]);

  const rows = useMemo(() => applyEarningsFilters(buildRows(payments, bookings), filters), [payments, bookings, filters]);
  const sum = totals(rows);
  const range = rangeLabel(rows, filters);
  const filtered = filters.type !== 'All' || filters.from != null || filters.to != null;
  const shown = showAll ? rows : rows.slice(0, PREVIEW);

  const exportPayslip = () => {
    const name = profile?.profile?.fullName || user?.email?.split('@')[0] || '';
    void Share.share({
      title: 'KD Ascend payslip',
      message: payslipText({ name, email: user?.email ?? '', rows, range }),
    });
  };

  const header = (
    <View style={{ gap: 19 }}>
      {/* Figma 196:4524: dark summary card */}
      <View style={styles.summary}>
        <Image source={earnImages.cardTexture} style={styles.texture} resizeMode="cover" />
        <View style={styles.summaryTop}>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={styles.range}>{range}</Text>
            <View>
              <Text style={styles.net}>{money(sum.net)}</Text>
              <Text style={styles.netLabel}>After Deduction</Text>
            </View>
          </View>
          <Image source={earnImages.coins} style={styles.coins} />
        </View>
        <View style={styles.chips}>
          <View style={[styles.chip, { backgroundColor: 'rgba(104,255,93,0.22)' }]}>
            <Text style={[styles.chipText, { color: '#71FF75' }]}>
              Earnings: <Text style={styles.chipBold}>{money(sum.earned)}</Text>
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: 'rgba(255,114,114,0.24)' }]}>
            <Text style={[styles.chipText, { color: '#FF7777' }]}>
              Penalties: <Text style={styles.chipBold}>{sum.penalties ? `–${money(sum.penalties)}` : '$0'}</Text>
            </Text>
          </View>
          <Pressable
            onPress={exportPayslip}
            disabled={rows.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Export payslip"
            style={({ pressed }) => [
              styles.chip,
              styles.exportChip,
              (pressed || rows.length === 0) && { opacity: rows.length === 0 ? 0.5 : 0.75 },
            ]}
          >
            <EarnSvg.Export />
            <Text style={[styles.chipText, { color: colors.white }]}>Export Payslip</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.historyRow}>
        <Text style={styles.history}>Transaction History</Text>
        {rows.length > PREVIEW ? (
          <Pressable onPress={() => setShowAll((v) => !v)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.viewAll}>{showAll ? 'Show Less' : 'View All'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <View style={styles.side} />
        <Text style={styles.title}>Earnings</Text>
        <View style={[styles.side, { alignItems: 'flex-end' }]}>
          <Pressable
            onPress={() => setFilterOpen(true)}
            style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={filtered ? 'Filters (on)' : 'Filters'}
          >
            <JobSvg.FilterWhite width={25.2} height={25.2} />
            {filtered ? <View style={styles.filterDot} /> : null}
          </Pressable>
        </View>
      </View>

      <FlatList
        data={shown}
        keyExtractor={(r) => r.txn.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: 19 }}
        ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.main} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              icon={<IconNavEarnings size={40} color={colors.grey} />}
              title={error ? 'Couldn’t load earnings' : filtered ? 'No matching transactions' : 'No earnings yet'}
              text={
                error ??
                (filtered
                  ? 'Try another transaction type or date range.'
                  : 'Payments for your completed jobs will show up here.')
              }
              action={filtered && !error ? { label: 'Clear filters', onPress: () => setFilters(DEFAULT_EARNINGS_FILTERS) } : undefined}
            />
          )
        }
        renderItem={({ item }) => <TxnCard row={item} />}
      />

      <BottomNav active="earnings" onChange={(t) => navigateTab(navigation, t)} />
      <EarningsFilterSheet
        visible={filterOpen}
        value={filters}
        onApply={(f) => {
          setFilters(f);
          setShowAll(false);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.gutter, paddingBottom: 20 },
  side: { width: 50 },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 22, lineHeight: 30.8, color: colors.text },
  filterBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.main, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.dark },
  content: { paddingHorizontal: layout.gutter, paddingBottom: 24, flexGrow: 1 },

  summary: { minHeight: 156, borderRadius: 20, backgroundColor: colors.dark, overflow: 'hidden', paddingHorizontal: 21, paddingVertical: 16, gap: 10, justifyContent: 'center' },
  texture: { position: 'absolute', left: -14, top: -178, width: 430, height: 430, opacity: 0.05 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  range: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 19.93, letterSpacing: -0.24, color: colors.white },
  net: { fontFamily: fonts.bold, fontSize: 25.8, lineHeight: 35.4, letterSpacing: -0.42, color: colors.white },
  netLabel: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19.93, letterSpacing: -0.24, color: 'rgba(255,255,255,0.61)' },
  coins: { width: 74, height: 74 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { height: 30, borderRadius: 100, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  exportChip: { flexDirection: 'row', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)' },
  chipText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19.93, letterSpacing: -0.24 },
  chipBold: { fontFamily: fonts.semibold },

  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  history: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24.68, letterSpacing: -0.3, color: colors.text },
  viewAll: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 24.68, letterSpacing: -0.3, color: colors.grey },

  card: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 12, paddingTop: 13, paddingBottom: 14, gap: 11 },
  idTag: { alignSelf: 'flex-start', height: 25, borderRadius: 10, backgroundColor: 'rgba(255,130,65,0.1)', paddingHorizontal: 10, justifyContent: 'center' },
  idText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 21.65, letterSpacing: -0.26, color: colors.main },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  company: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 24.68, letterSpacing: -0.3, color: colors.text },
  role: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15.84, color: colors.grey },
  amount: { minWidth: 66, height: 28, borderRadius: 100, backgroundColor: colors.greyBg, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  amountText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 24.68, letterSpacing: -0.3, color: colors.text },
  shift: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  shiftText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15.84, color: colors.grey },
  rule: { height: 1, backgroundColor: '#E0E0E0' },
  on: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15.84, color: colors.grey },
  onDate: { color: colors.dark },
  status: { height: 27, borderRadius: 100, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 19.93, letterSpacing: -0.24 },
});
