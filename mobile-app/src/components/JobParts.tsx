/**
 * Building blocks of the Jobs screens, built to the Figma specs of the MObile App page:
 * "Verified" (193:550), "Search" (197:5486), "Job Detail" (194:944), "Bookings" (196:1624 / 196:1765),
 * "confirmed job" (196:1989) and "Completed job" (196:2272).
 */
import React from 'react';
import { Linking, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from './AppText';
import { colors, fonts } from '../theme';
import {
  Dot,
  IconArrowUpRight,
  IconBack,
  IconBuilding,
  IconCalendarSmall,
  IconDollarCircle,
  IconNavigate,
  IconPerson,
  IconPersonOrange,
  IconPin,
  IconPinDetail,
  IconTick,
  IconWarning,
  MapImage,
  MapPin,
  TileDollar,
} from './JobIcons';
import {
  LATE_CANCEL_PENALTY,
  genders,
  rateLabel,
  shortDate,
  slotsLeft,
  timeLabel,
  type BookingState,
  type Job,
} from '../services/jobsService';

/** Design tokens used by these screens that the shared theme doesn't have yet. */
export const jobColors = {
  line: 'rgba(0,0,0,0.1)', // --stroke
  greenTag: 'rgba(12,183,98,0.16)', // --tag
  green: '#077D37', // --green
  blueTag: 'rgba(107,176,240,0.16)',
  blue: '#0566C0',
  redTag: 'rgba(255,55,55,0.08)',
  orangeTag: 'rgba(255,130,65,0.08)',
  field: '#E0E0E0',
  track: '#F2EDED',
};

/* ------------------------------------------------------------------ header */

/** Dark 32pt back button (Figma "Frame 1618876505" with weui:back-filled). */
export function DarkBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [styles.back, pressed && { opacity: 0.75 }]}
    >
      <IconBack />
    </Pressable>
  );
}

/** Back button, centred title (SemiBold 22 / 16) and an optional action on the right. */
export function ScreenHeader({
  title,
  onBack,
  right,
  small = false,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  small?: boolean;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{onBack ? <DarkBackButton onPress={onBack} /> : null}</View>
      <Text style={[styles.headerTitle, small && styles.headerTitleSmall]} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

/* ------------------------------------------------------------------ small pieces */

/** Round corporate badge. Corporates have no logo yet, so their initials in the brand ring. */
export function CorporateLogo({ name, size = 43 }: { name: string; size?: number }) {
  const letters =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '•';
  return (
    <View style={[styles.logo, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.logoText, { fontSize: size * 0.34 }]}>{letters}</Text>
    </View>
  );
}

export const NOTE_TEXT =
  ' All start/end times are estimates and may start/conclude earlier/later, subjected to hotel’s discretion.';

/** "👤 Male • 👤 Female • (2) Slots Left" (Figma 193:586). */
export function SlotsRow({ job }: { job: Job }) {
  const g = genders(job);
  const left = slotsLeft(job);
  const items: React.ReactNode[] = [];
  if (g.male && g.female) {
    items.push(
      <View key="m" style={styles.slotItem}>
        <IconPerson />
        <Text style={styles.slotText}>Male</Text>
      </View>,
      <View key="f" style={styles.slotItem}>
        <IconPerson />
        <Text style={styles.slotText}>Female</Text>
      </View>,
    );
  } else {
    items.push(
      <View key="g" style={styles.slotItem}>
        <IconPerson />
        <Text style={styles.slotText}>{g.male ? 'Male Only' : 'Female Only'}</Text>
      </View>,
    );
  }
  if (left != null) {
    items.push(
      <View key="s" style={styles.slotItem}>
        <View style={styles.slotCircle}>
          <Text style={styles.slotCircleText}>{left}</Text>
        </View>
        <Text style={styles.slotBold}>{left === 0 ? 'Fully Booked' : 'Slots Left'}</Text>
      </View>,
    );
  }
  return (
    <View style={styles.slotsRow}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <Dot /> : null}
          {it}
        </React.Fragment>
      ))}
    </View>
  );
}

/** Orange chips of the job detail: Male · Female · (2) Slots Left (Figma 194:1006). */
export function SlotChips({ job }: { job: Job }) {
  const g = genders(job);
  const left = slotsLeft(job);
  return (
    <View style={styles.chipRow}>
      {g.male ? (
        <View style={styles.chip}>
          <IconPersonOrange />
          <Text style={styles.chipText}>{g.female ? 'Male' : 'Male Only'}</Text>
        </View>
      ) : null}
      {g.female ? (
        <View style={styles.chip}>
          <IconPersonOrange />
          <Text style={styles.chipText}>{g.male ? 'Female' : 'Female Only'}</Text>
        </View>
      ) : null}
      {left != null ? (
        <View style={styles.chip}>
          <View style={styles.chipCircle}>
            <Text style={styles.chipCircleText}>{left}</Text>
          </View>
          <Text style={styles.chipText}>{left === 0 ? 'Fully Booked' : 'Slots Left'}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Calendar icon + "02 Feb 2026 • 6:00 PM to 12:00 AM". */
export function DateTimeLine({ job }: { job: Job }) {
  return (
    <View style={styles.dateLine}>
      <View style={styles.slotItem}>
        <IconCalendarSmall />
        <Text style={styles.dateText}>{shortDate(job.eventDate)}</Text>
      </View>
      <Dot />
      <Text style={styles.dateText}>{timeLabel(job.eventTime)}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.rule} />;
}

/** "View Detail ↗" outline button + orange action button (Figma "Frame 34"). */
export function CardButtons({
  onDetail,
  actionLabel,
  onAction,
  actionDisabled,
  style,
}: {
  onDetail: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.cardButtons, style]}>
      <Pressable
        onPress={onDetail}
        accessibilityRole="button"
        style={({ pressed }) => [styles.detailBtn, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.detailText}>View Detail</Text>
        <IconArrowUpRight />
      </Pressable>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          disabled={actionDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!actionDisabled }}
          style={({ pressed }) => [
            styles.actionBtn,
            actionDisabled && { backgroundColor: jobColors.field },
            pressed && !actionDisabled && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.actionText, actionDisabled && { color: colors.grey }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ job card (Home / Search) */

export function JobCard({
  job,
  onDetail,
  actionLabel,
  onAction,
  actionDisabled,
}: {
  job: Job;
  onDetail: () => void;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
}) {
  const rate = rateLabel(job.salary);
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <CorporateLogo name={job.corporateName} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.corpName} numberOfLines={1}>
            {job.corporateName}
          </Text>
          <View style={styles.addressRow}>
            <IconPin />
            <Text style={styles.address} numberOfLines={1}>
              {job.location || '—'}
            </Text>
          </View>
        </View>
        <Text style={styles.rate}>
          {rate.amount}
          {rate.unit}
        </Text>
      </View>
      <Divider />
      <View style={styles.roleBlock}>
        <Text style={styles.role} numberOfLines={1}>
          {job.title}
        </Text>
        <DateTimeLine job={job} />
      </View>
      <Divider />
      <Text style={styles.note}>
        <Text style={styles.noteBold}>NOTE:</Text>
        {NOTE_TEXT}
      </Text>
      <SlotsRow job={job} />
      <CardButtons onDetail={onDetail} actionLabel={actionLabel} onAction={onAction} actionDisabled={actionDisabled} />
    </View>
  );
}

/* ------------------------------------------------------------------ booking card (Bookings) */

export function BookingCard({
  job,
  state,
  earning,
  onDetail,
  onCancel,
}: {
  job: Job;
  state: BookingState;
  earning: string;
  onDetail: () => void;
  onCancel?: () => void;
}) {
  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.bookingRole} numberOfLines={1}>
            {job.title}
          </Text>
          <View style={styles.addressRow}>
            <IconBuilding />
            <Text style={styles.address} numberOfLines={1}>
              {job.corporateName}
            </Text>
          </View>
        </View>
        <StatusBadge state={state} />
      </View>
      <Divider />
      <DateTimeLine job={job} />
      <View style={styles.earnRow}>
        <IconDollarCircle />
        <Text style={styles.earnLabel}>Expected Earning</Text>
        <Text style={styles.earn}>{earning}</Text>
      </View>
      <CardButtons
        onDetail={onDetail}
        actionLabel={onCancel ? 'Cancel Booking' : undefined}
        onAction={onCancel}
        style={{ marginTop: 14 }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ status badge */

const BADGE: Record<BookingState, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Pending', bg: jobColors.orangeTag, fg: colors.main },
  confirmed: { label: 'Confirmed', bg: jobColors.greenTag, fg: jobColors.green },
  completed: { label: 'Completed', bg: jobColors.greenTag, fg: jobColors.green },
  cancelled: { label: 'Cancelled', bg: jobColors.redTag, fg: colors.error },
  job_cancelled: { label: 'Job Cancelled', bg: jobColors.redTag, fg: colors.error },
  rejected: { label: 'Rejected', bg: jobColors.line, fg: colors.dark },
};

/** Status tag. On the booking page "Confirmed" is blue (Figma 308:669); in lists it is green. */
export function StatusBadge({ state, detail = false }: { state: BookingState; detail?: boolean }) {
  const b =
    detail && state === 'confirmed' ? { label: 'Confirmed', bg: jobColors.blueTag, fg: jobColors.blue } : BADGE[state];
  return (
    <View style={[styles.badge, { backgroundColor: b.bg }]}>
      <Text style={[styles.badgeText, { color: b.fg }]}>{b.label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ detail sections */

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/** Corporate card at the top of Job Detail / booking pages (Figma 194:966, 85pt). */
export function CorporateCard({ job, subtitle, badge }: { job: Job; subtitle?: 'address' | 'role'; badge?: React.ReactNode }) {
  return (
    <View style={styles.corpCard}>
      <CorporateLogo name={job.corporateName} size={52} />
      <View style={{ flex: 1, minWidth: 0 }}>
        {subtitle === 'role' ? (
          <>
            <Text style={styles.corpCardNameSm} numberOfLines={1}>
              {job.corporateName}
            </Text>
            <Text style={styles.corpCardRole} numberOfLines={1}>
              {job.title}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.corpCardName} numberOfLines={1}>
              {job.corporateName}
            </Text>
            <View style={styles.addressRow}>
              <IconPinDetail />
              <Text style={styles.address} numberOfLines={2}>
                {job.location || '—'}
              </Text>
            </View>
          </>
        )}
      </View>
      {badge}
    </View>
  );
}

/** Three tiles (icon on top): Date · Time · Rate / Earnings (Figma 194:981). */
export function InfoTiles({ items }: { items: { icon: React.ReactNode; label: string; value: string }[] }) {
  return (
    <View style={styles.tiles}>
      {items.map((it, i) => (
        <View key={it.label} style={[styles.tile, { flex: i === 1 ? 149 : 108 }]}>
          {it.icon}
          <View style={styles.tileTextBox}>
            <Text style={styles.tileLabel}>{it.label}</Text>
            <Text style={styles.tileValue}>{it.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** 2 × 2 tiles with the icon on the right (Figma "Final Schedule & Earnings" 249:248). */
export function InfoGrid({ items }: { items: { icon: React.ReactNode; label: string; value: string }[] }) {
  const rows = [items.slice(0, 2), items.slice(2, 4)];
  return (
    <View style={{ gap: 18 }}>
      {rows.map((row, r) => (
        <View key={r} style={styles.gridRow}>
          {row.map((it) => (
            <View key={it.label} style={styles.gridTile}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tileLabel}>{it.label}</Text>
                <Text style={styles.tileValue}>{it.value}</Text>
              </View>
              {it.icon}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** About the Job: fixed NOTE, then the admin's description as bullets (one per line). */
export function AboutJob({ description }: { description: string }) {
  const lines = description
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*·]\s*/, '').trim())
    .filter(Boolean);
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle>About the Job</SectionTitle>
      <Text style={styles.body}>
        <Text style={styles.bodyBold}>NOTE:</Text>
        {NOTE_TEXT}
      </Text>
      {lines.length > 0 ? (
        <View>
          {lines.map((l, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={[styles.body, { flex: 1 }]}>{l}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function Requirements({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle>Requirements</SectionTitle>
      <View style={{ gap: 9 }}>
        {items.map((r, i) => (
          <View key={i} style={styles.reqRow}>
            <IconTick />
            <Text style={[styles.body, { flex: 1 }]}>{r}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Red Cancellation Policy box (Figma 194:1043). */
export function CancellationPolicy({ late = false }: { late?: boolean }) {
  return (
    <View style={styles.policy}>
      <IconWarning />
      <View style={{ flex: 1 }}>
        <Text style={styles.policyTitle}>Cancellation Policy</Text>
        <Text style={styles.policyText}>
          {late
            ? `As this job will start in less than 24 hours, cancelling this job now will incur a $${LATE_CANCEL_PENALTY} penalty.`
            : `Cancelling less than 24hours before the job starts will result in a $${LATE_CANCEL_PENALTY} penalty`}
        </Text>
      </View>
    </View>
  );
}

/** Event Location: map, pin and address (Figma 194:1052). Tapping opens the phone's maps app. */
export function EventLocation({ address }: { address: string }) {
  const open = () => {
    if (!address) return;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
  };
  return (
    <View style={{ gap: 21 }}>
      <SectionTitle>Event Location</SectionTitle>
      <Pressable
        onPress={open}
        accessibilityRole="link"
        accessibilityLabel={`Open ${address} in maps`}
        style={({ pressed }) => [styles.mapCard, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.map}>
          <MapImage />
          <View style={styles.mapPin}>
            <MapPin />
          </View>
        </View>
        <View style={styles.mapAddress}>
          <IconNavigate />
          <Text style={styles.mapAddressText}>{address || 'Address not provided'}</Text>
        </View>
      </Pressable>
    </View>
  );
}

/** "Payment Method: Bank Transfer   $" strip (Figma 305:430). */
export function PaymentMethodRow({ method }: { method: string }) {
  return (
    <View style={styles.payRow}>
      <Text style={styles.payLabel}>
        Payment Method: <Text style={styles.payValue}>{method}</Text>
      </Text>
      <TileDollar />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
          <Text style={styles.emptyLink}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const T = -0.26; // letter spacing used across the design (-0.2598)
const T2 = -0.3; // (-0.2961)

const styles = StyleSheet.create({
  back: {
    height: 32,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 32, paddingHorizontal: 20 },
  headerSide: { width: 44 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 30.8,
    color: colors.text,
  },
  headerTitleSmall: { fontSize: 16, lineHeight: 22.4 },
  logo: {
    borderWidth: 1,
    borderColor: colors.main,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontFamily: fonts.bold, color: colors.main },

  // Job card (Figma 193:555: 390 × 306, radius 20, content 351 wide from top 14)
  card: { backgroundColor: colors.greyBg, borderRadius: 20, paddingHorizontal: 19.5, paddingTop: 14, paddingBottom: 14, gap: 9 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10.5 },
  corpName: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21.65, letterSpacing: T, color: colors.text },
  rate: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 21.65, letterSpacing: T, color: colors.text, textAlign: 'right' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6.14 },
  address: { flex: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 21.65, letterSpacing: T, color: colors.grey },
  rule: { height: 1, backgroundColor: jobColors.line, alignSelf: 'stretch' },
  roleBlock: { minHeight: 46, gap: 6, justifyContent: 'center' },
  role: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 21.65, letterSpacing: T, color: colors.text },
  dateLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dateText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 21.65, letterSpacing: T, color: colors.grey },
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21.65, color: colors.grey },
  noteBold: { fontFamily: fonts.semibold, color: colors.dark },
  slotsRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  slotItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  slotText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 21.65, letterSpacing: T, color: colors.text },
  slotBold: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 21.65, letterSpacing: T, color: colors.text },
  slotCircle: { minWidth: 22, borderRadius: 100, backgroundColor: jobColors.line, alignItems: 'center', justifyContent: 'center' },
  slotCircleText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 21.65, letterSpacing: T, color: colors.text, textAlign: 'center' },
  cardButtons: { flexDirection: 'row', gap: 21, marginTop: 7 },
  detailBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  detailText: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24.68, letterSpacing: T2, color: colors.text },
  actionBtn: { flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.main, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24.68, letterSpacing: T2, color: colors.white },

  // Booking card (Figma 196:1625: 390 × 205)
  bookingCard: { backgroundColor: colors.greyBg, borderRadius: 20, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, gap: 9 },
  bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  bookingRole: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21.65, letterSpacing: T, color: colors.text },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: -2 },
  earnLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21.65, letterSpacing: T, color: colors.grey },
  earn: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 21.65, letterSpacing: T, color: colors.dark },

  badge: { height: 26, minWidth: 74, paddingHorizontal: 10, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 21.65, letterSpacing: T, textAlign: 'center' },

  // Job detail
  corpCard: {
    height: 85,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.5,
    backgroundColor: colors.greyBg,
    borderRadius: 20,
    paddingHorizontal: 18,
  },
  corpCardName: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 21.65, letterSpacing: T, color: colors.text },
  corpCardNameSm: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24.68, letterSpacing: T2, color: colors.text },
  corpCardRole: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, letterSpacing: T2, color: colors.grey },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24.68, letterSpacing: T2, color: colors.text },
  tiles: { flexDirection: 'row', gap: 13 },
  tile: { height: 122, backgroundColor: colors.greyBg, borderRadius: 16, alignItems: 'center', paddingTop: 16 },
  tileTextBox: { position: 'absolute', top: 66, left: 2, right: 2, alignItems: 'center' },
  tileLabel: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 21.65, letterSpacing: T, color: colors.grey, textAlign: 'center' },
  tileValue: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 21.65, letterSpacing: -0.4, color: colors.text, textAlign: 'center' },
  gridRow: { flexDirection: 'row', gap: 13 },
  gridTile: {
    flex: 1,
    height: 72,
    backgroundColor: colors.greyBg,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipRow: { flexDirection: 'row', gap: 13, flexWrap: 'wrap' },
  chip: {
    height: 33,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: jobColors.orangeTag,
    paddingHorizontal: 16,
    borderRadius: 30,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21.88, letterSpacing: T, color: colors.dark },
  chipCircle: {
    minWidth: 22,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCircleText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 20, letterSpacing: T, color: colors.main, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, letterSpacing: T2, color: colors.grey },
  bodyBold: { fontFamily: fonts.bold, color: colors.dark },
  bulletRow: { flexDirection: 'row', paddingLeft: 7 },
  bullet: { width: 14, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.grey },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  policy: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: jobColors.redTag,
    borderRadius: 14,
    paddingLeft: 19,
    paddingRight: 16,
    paddingTop: 11,
    paddingBottom: 12,
    minHeight: 88,
  },
  policyTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 21.65, letterSpacing: T, color: colors.error },
  policyText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 21.65, letterSpacing: T, color: colors.error },
  mapCard: { borderRadius: 20, overflow: 'hidden', backgroundColor: colors.greyBg, minHeight: 263 },
  map: { height: 192, overflow: 'hidden' },
  mapPin: { position: 'absolute', left: '68%', top: 119 },
  mapAddress: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingLeft: 15, paddingRight: 18, paddingTop: 16, paddingBottom: 16 },
  mapAddressText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21.65, letterSpacing: -0.4, color: colors.text },
  payRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.greyBg,
    borderRadius: 16,
    paddingLeft: 11,
    paddingRight: 16,
  },
  payLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 21.65, letterSpacing: T, color: colors.grey },
  payValue: { fontFamily: fonts.semibold, color: colors.text },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70, gap: 8, flex: 1 },
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
  emptyLink: { fontFamily: fonts.semibold, fontSize: 14, color: colors.main, textDecorationLine: 'underline', marginTop: 6 },
});
