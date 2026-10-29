import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg } from '../assets';
import { colors, fonts, layout, text } from '../theme';
import { CloseButton } from './AppModal';

type Props = {
  visible: boolean;
  title: string;
  options: readonly string[];
  value: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
};

/** Bottom sheet list for the "Select" fields (gender, nationality, bank…). */
export default function SelectModal({ visible, title, options, value, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const searchable = options.length > 12;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: searchable ? '80%' : '60%' }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <CloseButton onPress={onClose} />
        </View>
        {searchable ? (
          <View style={styles.search}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={colors.grey}
              style={styles.searchInput}
              autoCorrect={false}
            />
          </View>
        ) : null}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={[text.small, styles.empty]}>No matches</Text>}
          renderItem={({ item }) => {
            const active = item === value;
            return (
              <Pressable
                onPress={() => onSelect(item)}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.greyBg }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.rowText, active && { color: colors.main }]}>{item}</Text>
                {active ? <Svg.IconRadioOn /> : <View style={styles.radioOff} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 17,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    marginBottom: 12,
  },
  title: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 28, color: colors.text },
  search: {
    marginHorizontal: layout.gutter,
    marginBottom: 8,
    height: 48,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.stroke,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  searchInput: { ...text.input, paddingVertical: 0 },
  row: {
    minHeight: 52,
    paddingHorizontal: layout.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, flex: 1, marginRight: 12 },
  radioOff: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.11, borderColor: colors.dark },
  empty: { textAlign: 'center', paddingVertical: 24 },
});
