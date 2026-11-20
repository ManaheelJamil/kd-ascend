/**
 * Popups of the Jobs module, built to the Figma specs: Confirm Your Booking (281:655),
 * Booking Submitted (281:883) and Cancel Booking (308:620). The close button is the app's
 * shared one (same Figma asset, same 33pt / top 19 / right 26 position).
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import AppModal from './AppModal';
import { colors, fonts } from '../theme';
import { CancellationPolicy, jobColors } from './JobParts';
import {
  IconArrowRightWhite,
  IllusCancelBooking,
  IllusSubmitted,
  ModalCalendar,
  ModalClock,
  ModalDollar,
  PendingClock,
} from './JobIcons';
import { rateLabel, shortDate, timeLabel, type Job } from '../services/jobsService';

function ModalButton({
  title,
  onPress,
  tone,
  loading,
  disabled,
  right,
  flex = true,
}: {
  title: string;
  onPress: () => void;
  tone: 'outline' | 'orange' | 'red';
  loading?: boolean;
  disabled?: boolean;
  right?: React.ReactNode;
  flex?: boolean;
}) {
  const inactive = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.btn,
        flex && { flex: 1 },
        tone === 'outline' && styles.btnOutline,
        tone === 'orange' && { backgroundColor: colors.main },
        tone === 'red' && { backgroundColor: colors.error },
        pressed && !inactive && { opacity: 0.85 },
        disabled && !loading && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone === 'outline' ? colors.dark : colors.white} />
      ) : (
        <View style={styles.btnRow}>
          <Text style={[styles.btnText, tone === 'outline' && { color: colors.text }]}>{title}</Text>
          {right}
        </View>
      )}
    </Pressable>
  );
}

/** Grey summary card: company, role, time, date (and rate). */
function JobSummary({ job, showRate = true }: { job: Job; showRate?: boolean }) {
  const rate = rateLabel(job.salary);
  return (
    <View style={styles.summary}>
      <View>
        <Text style={styles.summaryCorp}>{job.corporateName}</Text>
        <Text style={styles.summaryRole}>{job.title}</Text>
      </View>
      <View style={{ gap: 9 }}>
        <View style={styles.summaryLine}>
          <ModalClock />
          <Text style={[styles.summaryText, { letterSpacing: -0.4 }]}>{timeLabel(job.eventTime)}</Text>
        </View>
        <View style={styles.summaryLine}>
          <ModalCalendar />
          <Text style={styles.summaryText}>{shortDate(job.eventDate)}</Text>
        </View>
        {showRate ? (
          <View style={styles.summaryLine}>
            <ModalDollar />
            <Text style={styles.summaryText}>
              {rate.amount}
              {rate.unit ? '/hour' : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function ConfirmBookingModal({
  job,
  visible,
  busy,
  onConfirm,
  onClose,
}: {
  job: Job | null;
  visible: boolean;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!job) return null;
  return (
    <AppModal visible={visible} onClose={busy ? undefined : onClose} cardStyle={styles.confirmCard}>
      <Text style={styles.titleLeft}>Confirm Your Booking</Text>
      <View style={{ marginTop: 28, gap: 8 }}>
        <View style={{ gap: 13 }}>
          <JobSummary job={job} />
          <CancellationPolicy />
        </View>
        <Text style={styles.subject}>This booking is subject to Admin’s approval.</Text>
      </View>
      <View style={[styles.row, { marginTop: 26 }]}>
        <ModalButton title="Cancel" tone="outline" onPress={onClose} disabled={busy} />
        <ModalButton title="Confirm Booking" tone="orange" onPress={onConfirm} loading={busy} />
      </View>
    </AppModal>
  );
}

export function BookingSubmittedModal({ visible, onHome }: { visible: boolean; onHome: () => void }) {
  return (
    <AppModal visible={visible} onClose={onHome} cardStyle={styles.submittedCard}>
      <View style={{ marginTop: 59.5 }}>
        <IllusSubmitted />
      </View>
      <View style={{ marginTop: 28, gap: 5, alignItems: 'center' }}>
        <Text style={styles.titleCenter}>Booking Submitted</Text>
        <Text style={styles.bodyCenter}>
          Your booking has been submitted successfully. You will be notified latest 3 days before the event.
        </Text>
      </View>
      <View style={styles.pending}>
        <PendingClock />
        <View style={{ flex: 1 }}>
          <Text style={styles.pendingTitle}>Pending Approval</Text>
          <Text style={styles.pendingText}>Your request will be reviewed by Admin.</Text>
        </View>
      </View>
      <View style={{ width: 186, marginTop: 15 }}>
        <ModalButton title="Go To Home" tone="orange" onPress={onHome} right={<IconArrowRightWhite />} flex={false} />
      </View>
    </AppModal>
  );
}

export function CancelBookingModal({
  job,
  visible,
  late,
  busy,
  onConfirm,
  onClose,
}: {
  job: Job | null;
  visible: boolean;
  late: boolean;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!job) return null;
  return (
    <AppModal visible={visible} onClose={busy ? undefined : onClose} cardStyle={styles.cancelCard}>
      <View style={{ alignItems: 'center', marginTop: 59 }}>
        <IllusCancelBooking />
      </View>
      <View style={{ marginTop: 24, gap: 12 }}>
        <Text style={styles.titleCenter}>Cancel Booking</Text>
        {late ? <CancellationPolicy late /> : null}
        <JobSummary job={job} showRate={false} />
        <Text style={styles.bodyCenter}>Are you sure you want to cancel?</Text>
      </View>
      <View style={[styles.row, { marginTop: 24 }]}>
        <ModalButton title="Go Back" tone="outline" onPress={onClose} disabled={busy} />
        <ModalButton title="Yes, Cancel" tone="red" onPress={onConfirm} loading={busy} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  confirmCard: { paddingHorizontal: 26, paddingTop: 25, paddingBottom: 19 },
  submittedCard: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 0, paddingBottom: 24 },
  cancelCard: { paddingHorizontal: 22, paddingTop: 0, paddingBottom: 17 },
  titleLeft: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 30.8, color: colors.black, paddingRight: 44 },
  titleCenter: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 30.8, color: colors.black, textAlign: 'center' },
  bodyCenter: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 21.12, color: colors.grey, textAlign: 'center' },
  summary: { backgroundColor: colors.greyBg, borderRadius: 16, paddingHorizontal: 16, paddingTop: 17, paddingBottom: 17, gap: 11 },
  summaryCorp: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24.68, letterSpacing: -0.3, color: colors.text },
  summaryRole: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, letterSpacing: -0.3, color: colors.grey },
  summaryLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 21.65, letterSpacing: -0.26, color: colors.text },
  subject: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, letterSpacing: -0.3, color: colors.grey, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 11 },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  btnOutline: { borderWidth: 1, borderColor: colors.dark, backgroundColor: colors.white },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  pending: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: jobColors.orangeTag,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 10,
    alignSelf: 'stretch',
    marginTop: 18,
  },
  pendingTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 21.65, letterSpacing: -0.26, color: colors.dark },
  pendingText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 21.65, letterSpacing: -0.26, color: colors.grey },
});
