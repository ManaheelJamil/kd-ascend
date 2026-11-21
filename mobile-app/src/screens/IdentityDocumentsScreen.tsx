import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import AccountLayout from '../components/AccountLayout';
import Button from '../components/Button';
import { IconDocumentLarge, IconRestart, IconUploadSmall } from '../components/AccountIcons';
import { useAuth } from '../context/AuthContext';
import type { StoredFile, UserDoc } from '../services/userService';
import { ID_DOCS } from '../services/identityDocs';
import { formatLongDate, toDate } from '../utils/format';
import { colors, fonts } from '../theme';
import type { ScreenProps } from '../navigation/types';

const STATUS = {
  verified: { label: 'Verified', bg: 'rgba(165,255,114,0.24)', fg: '#20AA30' },
  rejected: { label: 'Rejected', bg: 'rgba(255,55,55,0.12)', fg: colors.error },
  pending: { label: 'Pending', bg: 'rgba(255,130,65,0.14)', fg: colors.main },
} as const;

function subtitle(doc: StoredFile, state: keyof typeof STATUS) {
  const reviewed = toDate(doc.reviewedAt);
  const uploaded = toDate(doc.uploadedAt);
  if (state === 'verified') return reviewed ? `Verified On ${formatLongDate(reviewed)}` : 'Verified by Admin';
  if (state === 'rejected') return 'Please upload a new document';
  return uploaded ? `Uploaded On ${formatLongDate(uploaded)}` : 'Waiting for admin review';
}

type DocCard = { key: string; label: string; files: StoredFile[] };

/** The documents on the profile: Student Pass / IC with front and back, or one older single file. */
function documentsOf(profile: UserDoc | null | undefined): DocCard[] {
  const d = profile?.identityDocuments;
  if (d) {
    return ID_DOCS.filter((x) => d[x.key]).map((x) => ({
      key: x.key,
      label: x.label,
      files: [d[x.key]!.front, d[x.key]!.back],
    }));
  }
  const one = profile?.identityDocument;
  return one ? [{ key: 'single', label: one.label || 'Identity Document', files: [one] }] : [];
}

/** Figma "Identity Documents" (196:4852 with a document, 240:279 empty). */
export default function IdentityDocumentsScreen({ navigation }: ScreenProps<'IdentityDocuments'>) {
  const { profile } = useAuth();
  const docs = documentsOf(profile);
  const reviewed = profile?.identityDocument ?? null;
  // The admin reviews the latest upload; while the account is back under review it is pending.
  const state: keyof typeof STATUS =
    profile?.status === 'under_review' ? 'pending' : (reviewed?.status ?? (profile?.status === 'approved' ? 'verified' : 'pending'));
  const s = STATUS[state];
  const upload = () => navigation.navigate('UploadDocument');

  return (
    <AccountLayout
      title="Identity Documents"
      onBack={() => navigation.goBack()}
      contentTop={39}
      footer={
        <Button
          title={docs.length ? 'Upload New Document' : 'Upload Document'}
          onPress={upload}
          left={<IconUploadSmall />}
        />
      }
    >
      {docs.length ? (
        <View style={{ gap: 16 }}>
          {docs.map((doc) => (
            <View key={doc.key} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.flex}>
                  <Text style={styles.docType} numberOfLines={1}>
                    {doc.label}
                  </Text>
                  <Text style={styles.docDate}>{reviewed ? subtitle(reviewed, state) : 'Waiting for admin review'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <View style={[styles.dot, { backgroundColor: s.fg }]} />
                  <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
                </View>
              </View>
              <View style={styles.preview}>
                <Pressable
                  onPress={upload}
                  hitSlop={10}
                  style={styles.replace}
                  accessibilityRole="button"
                  accessibilityLabel={`Replace ${doc.label}`}
                >
                  <IconRestart />
                </Pressable>
                <IconDocumentLarge size={42} />
                <View style={{ alignItems: 'center', gap: 4 }}>
                  {doc.files.map((f, i) => (
                    <Text key={i} style={styles.fileName} numberOfLines={1}>
                      {f.name}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <IconDocumentLarge size={120} />
          <Text style={styles.emptyTitle}>No Document Uploaded</Text>
          <Text style={styles.emptyText}>No identity document uploaded yet.</Text>
        </View>
      )}
    </AccountLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: 20, backgroundColor: colors.greyBg, padding: 18, gap: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docType: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 25, color: colors.text },
  docDate: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15.84, color: colors.grey },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 27, paddingHorizontal: 10, borderRadius: 100 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 20 },
  preview: {
    height: 187,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 17,
    paddingHorizontal: 20,
  },
  replace: { position: 'absolute', top: 14, right: 14 },
  fileName: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18.48, color: 'rgba(94,94,94,0.72)' },
  empty: { alignItems: 'center', marginTop: 106, gap: 7 },
  emptyTitle: { marginTop: 7, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 33, color: colors.grey },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18.48, color: colors.grey },
});
