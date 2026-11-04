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
  /** Which document the user is adding (radio buttons). */
  selected: DocKind | null;
  onSelect: (doc: DocKind) => void;
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
export default function IdentityDocsForm({ selected, onSelect, value, onChange, error, onError, disabled }: Props) {
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

  const choose = (doc: DocKind) => {
    if (doc === selected) return;
    // One document at a time: switching clears the other one's photos.
    const cleared: IdDraft = { studentPass: { front: null, back: null }, ic: { front: null, back: null } };
    onChange({ ...cleared, [doc]: value[doc] });
    onSelect(doc);
    onError(null);
  };
  const doc = ID_DOCS.find((d) => d.key === selected) ?? null;
  const sides = doc ? value[doc.key] : null;
  const complete = !!(sides?.front && sides?.back);

  return (
    <View style={styles.wrap}>
      <View style={styles.radios} accessibilityRole="radiogroup">
        {ID_DOCS.map((d) => {
          const on = d.key === selected;
          return (
            <Pressable
              key={d.key}
              onPress={() => choose(d.key)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[styles.radioOption, on && styles.radioOptionOn]}
            >
              <View style={[styles.radio, on && styles.radioOn]}>
                {on ? <Svg.IconTickSmall /> : null}
              </View>
              <Text style={[styles.radioText, on && styles.radioTextOn]}>{d.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {doc && sides ? (
        <View style={[styles.card, complete && styles.cardDone]}>
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
      ) : (
        <Text style={styles.choose}>Select a document above to upload its front and back side.</Text>
      )}
      {error ? <Text style={text.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  radios: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  radioOption: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  radioOptionOn: { borderColor: colors.green, backgroundColor: 'rgba(77,205,133,0.08)' },
  radio: {
    width: 20,
    height: 20,
    flexShrink: 0,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.green, backgroundColor: colors.green },
  radioText: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.text },
  radioTextOn: { color: colors.text },
  choose: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.grey },
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
