import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Svg } from '../assets';
import { colors, fonts, text } from '../theme';
import { formatBytes } from '../utils/format';

export type UploadValue = { name: string; size: number | null; uri?: string; mimeType?: string };

type Props = {
  value: UploadValue | null;
  onPress: () => void;
  error?: string | null;
  loading?: boolean;
};

/** Dashed "Choose a file or drag & drop it here" box. */
export default function UploadBox({ value, onPress, error, loading }: Props) {
  const isImage = !!value?.uri && !!value.mimeType?.startsWith('image/');
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={[styles.box, !!error && styles.boxError]}
        accessibilityRole="button"
        accessibilityLabel={value ? `Selected ${value.name}. Change file` : 'Browse file'}
      >
        {value ? (
          <>
            {isImage ? (
              <Image source={{ uri: value.uri }} style={styles.thumb} />
            ) : (
              <Svg.IconUpload />
            )}
            <View style={styles.texts}>
              <Text style={styles.primary} numberOfLines={1}>
                {value.name}
              </Text>
              {value.size ? <Text style={styles.secondary}>{formatBytes(value.size)}</Text> : null}
            </View>
            <View style={styles.browse}>
              <Text style={styles.browseText}>Change File</Text>
            </View>
          </>
        ) : (
          <>
            <Svg.IconUpload />
            <View style={styles.texts}>
              <Text style={styles.primary}>Choose a file or drag & drop it here</Text>
              <Text style={styles.secondary}>JPEG, PNG, PDF, and MP4 formats, up to 50MB</Text>
            </View>
            <View style={styles.browse}>
              <Text style={styles.browseText}>Browse File</Text>
            </View>
          </>
        )}
      </Pressable>
      {error ? <Text style={text.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  box: {
    // Grows with its content, so the button never sits on top of the text (small or large fonts).
    minHeight: 187,
    borderRadius: 13.27,
    borderWidth: 2.04,
    borderStyle: 'dashed',
    borderColor: colors.stroke,
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingTop: 22.5,
    paddingBottom: 22,
    paddingHorizontal: 16,
  },
  boxError: { borderColor: colors.error },
  thumb: { width: 50, height: 50, borderRadius: 8 },
  texts: { marginTop: 9, alignItems: 'center', gap: 7.66 },
  primary: { fontFamily: fonts.semibold, fontSize: 15.32, lineHeight: 21, color: colors.text, textAlign: 'center' },
  secondary: { fontFamily: fonts.regular, fontSize: 13.27, lineHeight: 18, color: colors.grey, textAlign: 'center' },
  browse: {
    marginTop: 16,
    alignSelf: 'center',
    borderWidth: 1.02,
    borderColor: colors.grey,
    borderRadius: 8.17,
    paddingHorizontal: 16.85,
    paddingVertical: 4,
    backgroundColor: colors.white,
  },
  browseText: { fontFamily: fonts.medium, fontSize: 15.32, color: colors.grey, textAlign: 'center' },
});
