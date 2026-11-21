import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import AccountLayout from '../components/AccountLayout';
import TextField from '../components/TextField';
import Button from '../components/Button';
import SelectModal from '../components/SelectModal';
import UploadBox from '../components/UploadBox';
import { PendingReviewModal } from '../components/AccountModals';
import { IconCloseFilled, IconDocumentLarge } from '../components/AccountIcons';
import { navigateTab } from '../components/BottomNav';
import { Svg } from '../assets';
import { useAuth } from '../context/AuthContext';
import { pickDocument, uploadUserFile, type PickedFile } from '../services/storageService';
import { replaceIdentityDocuments, type StoredFile } from '../services/userService';
import { ID_DOCS, SIDE_LABEL, type DocKind, type DocSide } from '../services/identityDocs';
import { friendlyError } from '../services/errors';
import { colors, fonts, text } from '../theme';
import type { ScreenProps } from '../navigation/types';

type Errors = { type?: string | null; front?: string | null; back?: string | null; form?: string | null };

function Thumb({ file, onRemove }: { file: PickedFile; onRemove: () => void }) {
  const isImage = file.mimeType.startsWith('image/');
  return (
    <View style={styles.thumbWrap}>
      {isImage ? (
        <Image source={{ uri: file.uri }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.fileThumb]}>
          <IconDocumentLarge size={26} />
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
        </View>
      )}
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        style={styles.remove}
        accessibilityRole="button"
        accessibilityLabel="Remove file"
      >
        <IconCloseFilled />
      </Pressable>
    </View>
  );
}

/**
 * Figma "Upload Document" (240:333) and the "Document Uploaded!" popup (240:425).
 * Same rule as sign-up: a document needs both its front and back side.
 */
export default function UploadDocumentScreen({ navigation }: ScreenProps<'UploadDocument'>) {
  const { user, profile } = useAuth();
  const [kind, setKind] = useState<DocKind | null>(null);
  const [files, setFiles] = useState<Record<DocSide, PickedFile | null>>({ front: null, back: null });
  const [errors, setErrors] = useState<Errors>({});
  const [selectOpen, setSelectOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const label = ID_DOCS.find((d) => d.key === kind)?.label ?? '';

  const browse = (side: DocSide) => async () => {
    try {
      const picked = await pickDocument();
      if (picked) {
        setFiles((f) => ({ ...f, [side]: picked }));
        setErrors((e) => ({ ...e, [side]: null, form: null }));
      }
    } catch (e) {
      setErrors((x) => ({ ...x, [side]: e instanceof Error ? e.message : friendlyError(e) }));
    }
  };

  const onSubmit = async () => {
    const next: Errors = {
      type: kind ? null : 'Please select the document type.',
      front: files.front ? null : 'Please upload the front side.',
      back: files.back ? null : 'Please upload the back side.',
    };
    setErrors(next);
    if (next.type || next.front || next.back || !user || !kind || !files.front || !files.back) return;
    setLoading(true);
    try {
      const save = async (side: DocSide, f: PickedFile): Promise<StoredFile> => ({
        ...(await uploadUserFile(user.uid, 'identity', f)),
        label: `${label} — ${SIDE_LABEL[side]}`,
      });
      const front = await save('front', files.front);
      const back = await save('back', files.back);
      const existing = (profile?.identityDocuments ?? {}) as Record<string, { front: StoredFile; back: StoredFile }>;
      await replaceIdentityDocuments(user.uid, { ...existing, [kind]: { front, back } }, { ...front, label });
      setDone(true);
    } catch (e) {
      setErrors({ form: friendlyError(e, 'Upload failed. Please check your connection and try again.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccountLayout
      title="Upload Document"
      onBack={() => navigation.goBack()}
      contentTop={28}
      footer={
        <View style={styles.footer}>
          {errors.form ? <Text style={[text.fieldError, styles.center]}>{errors.form}</Text> : null}
          <Button title="Submit" onPress={onSubmit} loading={loading} />
        </View>
      }
    >
      <View style={styles.body}>
        <TextField
          label="Document Type"
          placeholder="Select"
          value={label}
          onPressField={() => setSelectOpen(true)}
          right={<Svg.IconChevronDown />}
          error={errors.type}
        />

        {(['front', 'back'] as DocSide[]).map((side) => (
          <View key={side} style={styles.upload}>
            <Text style={text.label}>
              Upload Document <Text style={styles.side}>({SIDE_LABEL[side]})</Text>
            </Text>
            <UploadBox value={null} onPress={browse(side)} error={errors[side]} loading={loading} />
            {files[side] ? (
              <Thumb file={files[side] as PickedFile} onRemove={() => setFiles((f) => ({ ...f, [side]: null }))} />
            ) : null}
          </View>
        ))}
      </View>

      <SelectModal
        visible={selectOpen}
        title="Document Type"
        options={ID_DOCS.map((d) => d.label)}
        value={label || null}
        onClose={() => setSelectOpen(false)}
        onSelect={(v) => {
          setKind(ID_DOCS.find((d) => d.label === v)?.key ?? null);
          setErrors((e) => ({ ...e, type: null }));
          setSelectOpen(false);
        }}
      />
      <PendingReviewModal
        visible={done}
        title="Document Uploaded!"
        message="Your document is under review. Verification may take 1–2 business days."
        onHome={() => {
          setDone(false);
          navigateTab(navigation, 'home');
        }}
      />
    </AccountLayout>
  );
}

const styles = StyleSheet.create({
  body: { gap: 22 },
  upload: { gap: 12 },
  side: { fontFamily: fonts.regular, color: colors.grey },
  thumbWrap: { width: 106, height: 69 },
  thumb: { width: 106, height: 69, borderRadius: 14, backgroundColor: colors.greyBg },
  fileThumb: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6 },
  fileName: { fontFamily: fonts.medium, fontSize: 10, color: colors.grey, maxWidth: 94 },
  remove: { position: 'absolute', top: 5, right: 6 },
  footer: { gap: 12 },
  center: { textAlign: 'center' },
});
