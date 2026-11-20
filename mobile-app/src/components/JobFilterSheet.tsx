/**
 * Filters bottom sheet (Figma "model" 197:5425): Company Name, Role Name, Hourly Rate Range,
 * "Only show jobs I can apply for".
 */
import React, { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from './AppText';
import SelectModal from './SelectModal';
import { colors, fonts } from '../theme';
import { IconChevronDown, IconFilterOrange, SliderThumb, Toggle } from './JobIcons';
import { jobColors } from './JobParts';

export type JobFilters = {
  company: string | null;
  role: string | null;
  minRate: number;
  maxRate: number;
  onlyApplicable: boolean;
};

export const RATE_MIN = 0;
export const RATE_MAX = 50;

export const DEFAULT_FILTERS: JobFilters = {
  company: null,
  role: null,
  minRate: RATE_MIN,
  maxRate: RATE_MAX,
  onlyApplicable: false,
};

export function activeFilterCount(f: JobFilters): number {
  return (
    (f.company ? 1 : 0) +
    (f.role ? 1 : 0) +
    (f.minRate !== RATE_MIN || f.maxRate !== RATE_MAX ? 1 : 0) +
    (f.onlyApplicable ? 1 : 0)
  );
}

/* ------------------------------------------------------------------ two-thumb slider */

const THUMB = 22;

function RangeSlider({
  min,
  max,
  low,
  high,
  onChange,
}: {
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const state = useRef({ low, high, width, startX: 0, which: 'low' as 'low' | 'high' });
  state.current.low = low;
  state.current.high = high;
  state.current.width = width;

  const toX = (v: number) => ((v - min) / (max - min)) * Math.max(width - THUMB, 1);
  const toValue = (x: number, w: number) => {
    const ratio = Math.min(Math.max(x / Math.max(w - THUMB, 1), 0), 1);
    return Math.round(min + ratio * (max - min));
  };

  const make = (which: 'low' | 'high') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const s = state.current;
        s.which = which;
        s.startX = ((which === 'low' ? s.low : s.high) - min) / (max - min) * Math.max(s.width - THUMB, 1);
      },
      onPanResponderMove: (_e, g) => {
        const s = state.current;
        const v = toValue(s.startX + g.dx, s.width);
        if (which === 'low') onChange(Math.min(v, s.high - 1), s.high);
        else onChange(s.low, Math.max(v, s.low + 1));
      },
    });

  const lowPan = useRef(make('low')).current;
  const highPan = useRef(make('high')).current;

  return (
    <View
      style={styles.slider}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityLabel={`Hourly rate from $${low} to $${high}`}
    >
      <View style={styles.track} />
      {width > 0 ? (
        <>
          <View style={[styles.trackOn, { left: toX(low) + THUMB / 2, width: Math.max(toX(high) - toX(low), 0) }]} />
          <View {...lowPan.panHandlers} style={[styles.thumb, { left: toX(low) }]} hitSlop={12}>
            <SliderThumb />
          </View>
          <View {...highPan.panHandlers} style={[styles.thumb, { left: toX(high) }]} hitSlop={12}>
            <SliderThumb />
          </View>
        </>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ sheet */

function Dropdown({ label, value, placeholder, onPress }: { label: string; value: string | null; placeholder: string; onPress: () => void }) {
  return (
    <View style={{ marginTop: 16, gap: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? 'any'}`}
        style={({ pressed }) => [styles.field, pressed && { opacity: 0.8 }]}
      >
        <Text style={[styles.fieldText, !value && { color: colors.grey }]} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <IconChevronDown />
      </Pressable>
    </View>
  );
}

export default function JobFilterSheet({
  visible,
  value,
  companies,
  roles,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: JobFilters;
  companies: string[];
  roles: string[];
  onApply: (f: JobFilters) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<JobFilters>(value);
  const [picker, setPicker] = useState<'company' | 'role' | null>(null);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const ANY = 'Any';

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
          <Pressable onPress={() => setDraft(DEFAULT_FILTERS)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.clear}>Clear All</Text>
          </Pressable>
        </View>

        <Dropdown label="Company Name" value={draft.company} placeholder="Company Name" onPress={() => setPicker('company')} />
        <Dropdown label="Role Name" value={draft.role} placeholder="Role Name" onPress={() => setPicker('role')} />

        <Text style={[styles.label, { marginTop: 16 }]}>Hourly Rate Range</Text>
        <RangeSlider
          min={RATE_MIN}
          max={RATE_MAX}
          low={draft.minRate}
          high={draft.maxRate}
          onChange={(minRate, maxRate) => setDraft((d) => ({ ...d, minRate, maxRate }))}
        />
        <View style={styles.rangeLabels}>
          <Text style={styles.rangeText}>${draft.minRate}/hr</Text>
          <Text style={styles.rangeText}>
            ${draft.maxRate}
            {draft.maxRate === RATE_MAX ? '+' : ''}/hr
          </Text>
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Availability</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Only show jobs I can apply for</Text>
          <Pressable
            onPress={() => setDraft((d) => ({ ...d, onlyApplicable: !d.onlyApplicable }))}
            hitSlop={10}
            accessibilityRole="switch"
            accessibilityState={{ checked: draft.onlyApplicable }}
            accessibilityLabel="Only show jobs I can apply for"
          >
            <Toggle on={draft.onlyApplicable} />
          </Pressable>
        </View>

        <View style={styles.buttons}>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.btn, styles.btnOutline, pressed && { opacity: 0.8 }]} accessibilityRole="button">
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

      <SelectModal
        visible={picker === 'company'}
        title="Company Name"
        options={[ANY, ...companies]}
        value={draft.company ?? ANY}
        onSelect={(v) => {
          setDraft((d) => ({ ...d, company: v === ANY ? null : v }));
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <SelectModal
        visible={picker === 'role'}
        title="Role Name"
        options={[ANY, ...roles]}
        value={draft.role ?? ANY}
        onSelect={(v) => {
          setDraft((d) => ({ ...d, role: v === ANY ? null : v }));
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  grabber: { alignSelf: 'center', width: 50, gap: 2.7, marginBottom: 31 },
  grabberBar: { height: 6.36, borderRadius: 27, backgroundColor: '#D9D9D9' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 4 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24.68, letterSpacing: -0.3, color: colors.text },
  clear: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 24.68,
    letterSpacing: -0.3,
    color: colors.main,
    textDecorationLine: 'underline',
  },
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
  slider: { height: 22, justifyContent: 'center', marginTop: 11 },
  track: { height: 10, borderRadius: 20, backgroundColor: jobColors.track },
  trackOn: { position: 'absolute', height: 10, borderRadius: 20, backgroundColor: colors.main },
  thumb: { position: 'absolute', width: THUMB, height: THUMB },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  rangeText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18.48, color: colors.grey },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 9 },
  toggleText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18.48, color: colors.grey, flex: 1 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 43, marginBottom: 20 },
  btn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { borderWidth: 1, borderColor: colors.dark },
  btnText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
});
