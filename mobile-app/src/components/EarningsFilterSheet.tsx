/**
 * Earnings filters bottom sheet (Figma "model" 196:4759): Transaction Type, Sort By, Date Range.
 * The dropdowns open as lists (Figma "Dropdown" 267:687 / 271:731); the date range uses the
 * app's "Select Date" calendar (Figma "Calendar" 271:748) twice: start date, then end date.
 */
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from './AppText';
import DatePickerModal from './DatePickerModal';
import { IconChevronDown, IconFilterOrange } from './JobIcons';
import { jobColors } from './JobParts';
import { EarnSvg } from '../assets';
import { colors, fonts } from '../theme';
import {
  DEFAULT_EARNINGS_FILTERS,
  TXN_SORTS,
  TXN_TYPES,
  fieldDate,
  startOfDay,
  type EarningsFilters,
} from '../services/earningsService';

function Dropdown<T extends string>({
  label,
  value,
  options,
  open,
  onToggle,
  onPick,
}: {
  label: string;
  value: T;
  options: readonly T[];
  open: boolean;
  onToggle: () => void;
  onPick: (v: T) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.field, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.fieldText}>{value}</Text>
        <View style={open ? { transform: [{ rotate: '180deg' }] } : undefined}>
          <IconChevronDown />
        </View>
      </Pressable>
      {open ? (
        <View style={styles.list}>
          {options.map((o) => {
            const on = o === value;
            return (
              <Pressable
                key={o}
                onPress={() => onPick(o)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [styles.item, on && styles.itemOn, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.itemText, on && styles.itemTextOn]}>{o}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default function EarningsFilterSheet({
  visible,
  value,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: EarningsFilters;
  onApply: (f: EarningsFilters) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<EarningsFilters>(value);
  const [open, setOpen] = useState<'type' | 'sort' | null>(null);
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setOpen(null);
      setRangeError(null);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const rangeText =
    draft.from != null || draft.to != null
      ? `${draft.from != null ? fieldDate(draft.from) : 'Start'} - ${draft.to != null ? fieldDate(draft.to) : 'Today'}`
      : null;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close filters" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grabber}>
          <View style={styles.grabberBar} />
          <View style={styles.grabberBar} />
        </View>
        <View style={styles.head}>
          <IconFilterOrange />
          <Text style={styles.title}>Filters</Text>
          <Pressable
            onPress={() => {
              setDraft(DEFAULT_EARNINGS_FILTERS);
              setRangeError(null);
            }}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.clear}>Clear All</Text>
          </Pressable>
        </View>

        <View style={{ gap: 16 }}>
          <Dropdown
            label="Transaction Type"
            value={draft.type}
            options={TXN_TYPES}
            open={open === 'type'}
            onToggle={() => setOpen((o) => (o === 'type' ? null : 'type'))}
            onPick={(type) => {
              setDraft((d) => ({ ...d, type }));
              setOpen(null);
            }}
          />
          <Dropdown
            label="Sort By"
            value={draft.sort}
            options={TXN_SORTS}
            open={open === 'sort'}
            onToggle={() => setOpen((o) => (o === 'sort' ? null : 'sort'))}
            onPick={(sort) => {
              setDraft((d) => ({ ...d, sort }));
              setOpen(null);
            }}
          />
          <View style={{ gap: 12 }}>
            <Text style={styles.label}>Date Range</Text>
            <Pressable
              onPress={() => {
                setOpen(null);
                setPicking('from');
              }}
              accessibilityRole="button"
              accessibilityLabel={`Date range: ${rangeText ?? 'all dates'}`}
              style={({ pressed }) => [styles.field, pressed && { opacity: 0.8 }]}
            >
              <Text style={[styles.fieldText, !rangeText && { color: colors.grey }]}>
                {rangeText ?? 'Select start and end date'}
              </Text>
              <EarnSvg.Calendar width={22} height={22} />
            </Pressable>
            {rangeError ? <Text style={styles.error}>{rangeError}</Text> : null}
          </View>
        </View>

        <View style={styles.buttons}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.btn, styles.btnOutline, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
          >
            <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => onApply(draft)}
            style={({ pressed }) => [styles.btn, { backgroundColor: colors.main }, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>Apply Filter</Text>
          </Pressable>
        </View>
      </View>

      <DatePickerModal
        visible={picking === 'from'}
        title="Start Date"
        value={draft.from != null ? new Date(draft.from) : new Date()}
        minYear={2024}
        onClose={() => setPicking(null)}
        onSave={(d) => {
          const from = startOfDay(d.getTime());
          setDraft((x) => ({ ...x, from, to: x.to != null && x.to < from ? null : x.to }));
          setRangeError(null);
          setPicking('to');
        }}
      />
      <DatePickerModal
        visible={picking === 'to'}
        title="End Date"
        value={draft.to != null ? new Date(draft.to) : new Date()}
        minYear={2024}
        onClose={() => setPicking(null)}
        onSave={(d) => {
          const to = startOfDay(d.getTime());
          if (draft.from != null && to < draft.from) {
            setRangeError('The end date must be on or after the start date.');
          } else {
            setDraft((x) => ({ ...x, to }));
            setRangeError(null);
          }
          setPicking(null);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 16 },
  grabber: { alignSelf: 'center', width: 50, gap: 2.7, marginBottom: 31 },
  grabberBar: { height: 6.36, borderRadius: 27, backgroundColor: '#D9D9D9' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 20 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24.68, letterSpacing: -0.3, color: colors.text },
  clear: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 24.68, color: colors.main, textDecorationLine: 'underline' },
  label: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 21.12, color: colors.dark },
  field: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: jobColors.field,
    paddingLeft: 18,
    paddingRight: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 18.48, color: colors.text },
  // Figma "Dropdown": white card, 14 radius, selected row on grey
  list: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: jobColors.field,
    backgroundColor: colors.white,
    padding: 6,
    marginTop: -4,
  },
  item: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  itemOn: { backgroundColor: colors.greyBg },
  itemText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: colors.grey },
  itemTextOn: { fontFamily: fonts.semibold, color: colors.text },
  error: { fontFamily: fonts.medium, fontSize: 12, color: colors.error },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 40, marginBottom: 20 },
  btn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { borderWidth: 1, borderColor: colors.dark },
  btnText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
});
