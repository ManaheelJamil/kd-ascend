import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import TitleBlock from '../components/TitleBlock';
import Button from '../components/Button';
import Stepper from '../components/Stepper';
import UploadBox from '../components/UploadBox';
import { ArrowIcon } from '../components/Icons';
import { Svg } from '../assets';
import { useAuth } from '../context/AuthContext';
import { pickDocument, uploadUserFile, type PickedFile } from '../services/storageService';
import { saveIdentityDocument } from '../services/userService';
import { friendlyError } from '../services/errors';
import { colors, fonts, text } from '../theme';
import type { ScreenProps } from '../navigation/types';

function Accepted({ label }: { label: string }) {
  return (
    <View style={styles.accepted}>
      <View style={styles.tickCircle}>
        <View style={styles.tickPos}>
          <Svg.IconTickSmall />
        </View>
      </View>
      <Text style={styles.acceptedText}>{label}</Text>
    </View>
  );
}

export default function IdentityUploadScreen({ navigation }: ScreenProps<'IdentityUpload'>) {
  const { user, profile } = useAuth();
  const existing = profile?.identityDocument ?? null;
  const [file, setFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const browse = async () => {
    try {
      const picked = await pickDocument();
      if (picked) {
        setFile(picked);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : friendlyError(e));
    }
  };

  const onNext = async () => {
    if (!user) return;
    if (!file && !existing) return setError('Please upload your identity document.');
    setLoading(true);
    try {
      if (file) {
        const stored = await uploadUserFile(user.uid, 'identity', file);
        await saveIdentityDocument(user.uid, stored);
      }
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
            <Text style={styles.hint}>Please upload a valid identity document:</Text>
          </View>
          <View style={styles.acceptedRow}>
            <Accepted label="Student Pass" />
            <Accepted label="Identity Card (IC)" />
          </View>
        </View>

        <View style={styles.upload}>
          <Text style={text.label}>
            Upload Document <Text style={styles.side}>(Front Side)</Text>
          </Text>
          <UploadBox
            value={file ?? existing}
            onPress={browse}
            error={error}
            loading={loading}
          />
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 26 },
  body: { marginTop: 32, gap: 25 },
  instructions: { gap: 12 },
  instructionText: { gap: 8 },
  hint: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18.48, color: colors.grey },
  acceptedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  accepted: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tickCircle: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.green },
  tickPos: { position: 'absolute', left: 2.89, top: 2.92 },
  acceptedText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18.48, color: colors.text },
  upload: { gap: 12 },
  side: { fontFamily: fonts.regular, color: colors.grey },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 18 },
  half: { flex: 1, maxWidth: 186 },
});
