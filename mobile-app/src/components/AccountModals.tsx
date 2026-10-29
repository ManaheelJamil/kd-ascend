import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import AppModal from './AppModal';
import Button from './Button';
import { ArrowIcon } from './Icons';
import { images } from '../assets';
import { colors, fonts, text } from '../theme';

/**
 * "Update Profile?" (Figma 196:5179): warning triangle, explanation that the account goes back
 * to review, Cancel | Continue.
 */
export function ConfirmReviewModal({
  visible,
  title,
  message,
  loading,
  onCancel,
  onContinue,
}: {
  visible: boolean;
  title: string;
  /** Body text; the word "Unverified" is drawn in orange like the design. */
  message: string;
  loading?: boolean;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const [before, after] = message.split('Unverified');
  return (
    <AppModal visible={visible} onClose={loading ? undefined : onCancel}>
      <View style={styles.content}>
        <Image source={images.illusWarning} style={styles.warning} resizeMode="contain" />
        <View style={styles.texts}>
          <Text style={text.modalTitle}>{title}</Text>
          <Text style={[text.modalBody, styles.body]}>
            {before}
            {after !== undefined ? (
              <>
                <Text style={styles.orange}>Unverified</Text>
                {after}
              </>
            ) : null}
          </Text>
        </View>
        <View style={styles.row}>
          <Button title="Cancel" variant="outline" onPress={onCancel} disabled={loading} style={styles.half} />
          <Button title="Continue" onPress={onContinue} loading={loading} style={styles.half} />
        </View>
      </View>
    </AppModal>
  );
}

/**
 * "Profile Updated" / "Document Uploaded!" (Figma 196:5242, 240:425): green badge, message,
 * "Pending Approval" note and an orange "Go To Home" button.
 */
export function PendingReviewModal({
  visible,
  title,
  message,
  onHome,
}: {
  visible: boolean;
  title: string;
  message: string;
  onHome: () => void;
}) {
  return (
    <AppModal visible={visible} onClose={onHome}>
      <View style={styles.content}>
        <Image source={images.illusVerifiedBadge} style={styles.badge} resizeMode="contain" />
        <View style={styles.texts}>
          <Text style={text.modalTitle}>{title}</Text>
          <Text style={[text.modalBody, styles.body]}>{message}</Text>
        </View>
        <View style={styles.pending}>
          <Image source={images.iconClockOrange} style={styles.clock} />
          <View style={styles.flex}>
            <Text style={styles.pendingTitle}>Pending Approval</Text>
            <Text style={styles.pendingText}>Your request will be reviewed by Admin.</Text>
          </View>
        </View>
        <Button title="Go To Home" onPress={onHome} right={<ArrowIcon />} style={styles.home} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 30, paddingBottom: 20, gap: 18 },
  warning: { width: 133, height: 133 },
  badge: { width: 93, height: 93, marginTop: 30 },
  texts: { alignItems: 'center', gap: 5, width: '100%' },
  body: { maxWidth: 342 },
  orange: { color: colors.main },
  row: { flexDirection: 'row', gap: 11, alignSelf: 'stretch', marginTop: 17 },
  half: { flex: 1 },
  pending: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,130,65,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  clock: { width: 29, height: 29 },
  flex: { flex: 1 },
  pendingTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 22, color: colors.dark },
  pendingText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 22, color: colors.grey },
  home: { minWidth: 186, paddingHorizontal: 24 },
});
