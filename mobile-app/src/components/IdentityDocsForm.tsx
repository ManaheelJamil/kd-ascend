import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { Svg } from '../assets';
import { pickDocument } from '../services/storageService';
import { friendlyError } from '../services/errors';
import { ID_DOCS, SIDE_LABEL, type DocKind, type DocSide, type DraftFile, type IdDraft } from '../services/identityDocs';
import { formatBytes } from '../utils/format';
import { colors, fonts, layout, text } from '../theme';

type Props = {
  value: IdDraft;
  onChange: (next: IdDraft) => void;
  error?: string | null;
  onError: (message: string | null) => void;
  disabled?: boolean;
};

function SideRow({
  side,
  file,
  onPress,
  disabled,
}: {
  side: DocSide;
  file: DraftFile | null;
  onPress: () => void;
  disabled?: boolean;
}) {
  const uri = file && 'uri' in file ? file.uri : undefined;
  const mime = file ? ('mimeType' in file ? file.mimeType : file.contentType) : '';
  const isImage = !!uri && mime.startsWith('image/');
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={file ? `${SIDE_LABEL[side]}: ${file.name}. Change file` : `Upload ${SIDE_LABEL[side]}`}
      style={({ pressed }) => [styles.row, file && styles.rowDone, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.thumbWrap}>
        {isImage ? <Image source={{ uri }} style={styles.thumb} /> : <Svg.IconUpload width={22} height={22} />}
      </View>
      <View style={styles.rowTexts}>
        <Text style={styles.sideLabel}>{SIDE_LABEL[side]}</Text>
        <Text style={styles.fileName} numberOfLines={1}>
          {file ? `${file.name}${file.size ? ` · ${formatBytes(file.size)}` : ''}` : 'JPG, PNG or PDF'}
        </Text>
      </View>
      <View style={[styles.action, file && styles.actionDone]}>
        <Text style={[styles.actionText, file && styles.actionTextDone]}>{file ? 'Change' : 'Upload'}</Text>
      </View>
    </Pressable>
  );
}

/**
 * Student Pass and Identity Card (IC), each with a front and a back upload.
 * At least one document (both sides) is required — checked by validateDraft().
 */
export default function IdentityDocsForm({ value, onChange, error, onError, disabled }: Props) {
  const pick = async (doc: DocKind, side: DocSide) => {
    try {
      const picked = await pickDocument();
      if (!picked) return;
      onChange({ ...value, [doc]: { ...value[doc], [side]: picked } });
      onError(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : friendlyError(e));
    }
  };

  return (
    <View style={styles.wrap}>
      {ID_DOCS.map((doc) => {
        const sides = value[doc.key];
        const complete = !!(sides.front && sides.back);
        return (
          <View key={doc.key} style={[styles.card, complete && styles.cardDone]}>
            <View style={styles.cardHeader}>
              <Text style={text.label}>{doc.label}</Text>
              {complete ? (
                <View style={styles.doneBadge}>
                  <Text style={styles.doneText}>Added</Text>
                </View>
              ) : null}
            </View>
            <SideRow side="front" file={sides.front} onPress={() => pick(doc.key, 'front')} disabled={disabled} />
            <SideRow side="back" file={sides.back} onPress={() => pick(doc.key, 'back')} disabled={disabled} />
          </View>
        );
      })}
      {error ? <Text style={text.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  card: { borderWidth: 1, borderColor: colors.stroke, borderRadius: 13, padding: 14, gap: 10 },
  cardDone: { borderColor: colors.green },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  doneBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 100, backgroundColor: 'rgba(77,205,133,0.14)' },
  doneText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: colors.green },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.stroke,
  },
  rowDone: { borderStyle: 'solid', backgroundColor: colors.greyBg },
  thumbWrap: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.white },
  thumb: { width: 40, height: 40 },
  rowTexts: { flex: 1, minWidth: 0 },
  sideLabel: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.text },
  fileName: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.grey },
  action: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.main },
  actionDone: { borderColor: colors.grey },
  actionText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.main },
  actionTextDone: { color: colors.text },
});
