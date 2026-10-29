import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import TitleBlock from '../components/TitleBlock';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/authService';
import { colors, fonts } from '../theme';
import { config } from '../config';
import { resubmitLabel } from '../services/resubmit';
import type { ScreenProps } from '../navigation/types';

const COPY = {
  under_review: {
    title: 'Waiting for Approval',
    message:
      'Thanks for signing up! Your account is being reviewed by our team. You’ll be able to use the app as soon as it’s approved — this page updates automatically.',
    tone: colors.main,
    badge: 'Under review',
  },
  rejected: {
    title: 'Application Not Approved',
    message: 'Unfortunately your account application was not approved.',
    tone: colors.error,
    badge: 'Rejected',
  },
  blacklisted: {
    title: 'Account Blocked',
    message: 'Your account has been blocked, so you can’t use the app right now.',
    tone: colors.error,
    badge: 'Blocked',
  },
} as const;

/**
 * Shown instead of the app until an admin approves the account,
 * and whenever an admin rejects or blacklists it. Updates live from Firestore.
 */
export default function AccountStatusScreen({ navigation }: ScreenProps<'AccountStatus'>) {
  const { profile, user } = useAuth();
  const status = profile?.status === 'rejected' || profile?.status === 'blacklisted' ? profile.status : 'under_review';
  const resubmitted = status === 'under_review' && !!profile?.resubmittedFrom;
  const copy = resubmitted
    ? {
        ...COPY.under_review,
        title: 'Resubmitted for Review',
        message:
          'Thanks — your updated details were sent to our team. You’ll be able to use the app once they’re approved. This page updates automatically.',
      }
    : COPY[status];
  // Fields the admin asked this user to fix; empty = no Resubmit option.
  const fixFields = status !== 'under_review' ? (profile?.resubmitFields ?? []) : [];
  const reason = status === 'rejected' ? profile?.rejectionReason : status === 'blacklisted' ? profile?.blacklistReason : undefined;
  const supportEmail = config.supportEmail;

  return (
    <AuthLayout
      footer={
        <View style={styles.footer}>
          {fixFields.length ? <Button title="Resubmit" onPress={() => navigation.navigate('Resubmit')} /> : null}
          {status !== 'under_review' && supportEmail ? (
            <Button
              variant={fixFields.length ? 'outline' : 'primary'}
              title="Contact Support"
              onPress={() => Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent(`${config.appName} account`)}`)}
            />
          ) : null}
          <Button title="Sign Out" variant="outline" onPress={() => signOut()} />
        </View>
      }
    >
      <View style={[styles.badge, { backgroundColor: `${copy.tone}17` }]}>
        <View style={[styles.dot, { backgroundColor: copy.tone }]} />
        <Text style={[styles.badgeText, { color: copy.tone }]}>{copy.badge}</Text>
      </View>
      <TitleBlock style={styles.title} title={copy.title} subtitle={copy.message} />
      {reason ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>Reason</Text>
          <Text style={styles.reasonText}>{reason}</Text>
        </View>
      ) : null}
      {fixFields.length ? (
        <View style={styles.fixBox}>
          <Text style={styles.reasonLabel}>Please update</Text>
          <Text style={styles.reasonText}>{fixFields.map(resubmitLabel).join(', ')}</Text>
          <Text style={styles.fixHint}>Tap “Resubmit”, correct these details and send them for review again.</Text>
        </View>
      ) : null}
      <Text style={styles.account}>Signed in as {user?.email ?? profile?.email}</Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 13 },
  title: { marginTop: 16 },
  reasonBox: { marginTop: 22, borderRadius: 12, backgroundColor: colors.greyBg, padding: 16, gap: 6 },
  reasonLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  reasonText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.grey },
  fixBox: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,130,65,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,130,65,0.25)',
    padding: 16,
    gap: 6,
  },
  fixHint: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.grey },
  account: { marginTop: 22, fontFamily: fonts.regular, fontSize: 13, color: colors.grey },
  footer: { gap: 12 },
});
