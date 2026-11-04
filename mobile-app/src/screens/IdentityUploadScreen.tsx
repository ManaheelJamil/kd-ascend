import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import AuthLayout from '../components/AuthLayout';
import TitleBlock from '../components/TitleBlock';
import Button from '../components/Button';
import Stepper from '../components/Stepper';
import IdentityDocsForm from '../components/IdentityDocsForm';
import { ArrowIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { saveIdentityDocuments } from '../services/userService';
import { draftFromProfile, uploadDraft, validateDraft, type DocKind, type IdDraft } from '../services/identityDocs';
import { friendlyError } from '../services/errors';
import { colors, fonts, text } from '../theme';
import type { ScreenProps } from '../navigation/types';

export default function IdentityUploadScreen({ navigation }: ScreenProps<'IdentityUpload'>) {
  const { user, profile } = useAuth();
  const [docs, setDocs] = useState<IdDraft>(() => draftFromProfile(profile));
  // Pre-select the document the user already uploaded (if any).
  const [docKind, setDocKind] = useState<DocKind | null>(() =>
    docs.studentPass.front || docs.studentPass.back ? 'studentPass' : docs.ic.front || docs.ic.back ? 'ic' : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onNext = async () => {
    if (!user) return;
    const problem = docKind ? validateDraft(docs) : 'Please select Student Pass or Identity Card (IC).';
    if (problem) return setError(problem);
    setLoading(true);
    try {
      await saveIdentityDocuments(user.uid, await uploadDraft(user.uid, docs));
      navigation.navigate('PayoutMethod');
    } catch (e) {
      setError(friendlyError(e, 'Upload failed. Please check your connection and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const onBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('PersonalInfo'));

  return (
    <AuthLayout
      sheetPaddingTop={30}
      footer={
        <View style={styles.footer}>
          <Button
            title="Back"
            variant="outline"
            onPress={onBack}
            left={<ArrowIcon dark left />}
            style={styles.half}
          />
          <Button title="Next" onPress={onNext} loading={loading} right={<ArrowIcon />} style={styles.half} />
        </View>
      }
    >
      <Stepper current={2} />
      <TitleBlock
        style={styles.title}
        title="Verify Your Identity"
        subtitle="Please upload a valid identity document for verification purposes."
      />

      <View style={styles.body}>
        <View style={styles.instructions}>
          <View style={styles.instructionText}>
            <Text style={text.label}>Instructions</Text>
            <Text style={styles.hint}>
              Choose one document and upload both its front and back side:
            </Text>
          </View>
          <IdentityDocsForm
            selected={docKind}
            onSelect={setDocKind}
            value={docs}
            onChange={setDocs}
            error={error}
            onError={setError}
            disabled={loading}
          />
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 26 },
  body: { marginTop: 32, gap: 25 },
  instructions: { gap: 14 },
  instructionText: { gap: 8 },
  hint: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18.48, color: colors.grey },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 18 },
  half: { flex: 1, maxWidth: 186 },
});
