import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { images, Svg } from '../assets';
import { colors, fonts } from '../theme';
import AppModal, { CloseButton } from './AppModal';
import Button from './Button';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  visible: boolean;
  value: Date | null;
  onClose: () => void;
  onSave: (date: Date) => void;
  maxDate?: Date;
  minYear?: number;
  title?: string;
};

/** Weekday row + 6 week rows (32 each) + 6 gaps of 21.7. */
const GRID_HEIGHT = 32 * 7 + 21.7 * 6;

const sameDay = (a: Date | null, b: Date) =>
  !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Select Date" popup from the Birthday frame. Tap the year to jump between years. */
export default function DatePickerModal({
  visible,
  value,
  onClose,
  onSave,
  maxDate = new Date(),
  minYear = 1940,
  title = 'Select Date',
}: Props) {
  const fallback = useMemo(() => new Date(Math.min(maxDate.getFullYear(), 2000), 0, 1), [maxDate]);
  const [view, setView] = useState(() => value ?? fallback);
  const [selected, setSelected] = useState<Date | null>(value);
  const [pickYear, setPickYear] = useState(false);

  useEffect(() => {
    if (visible) {
      setView(value ?? fallback);
      setSelected(value);
      setPickYear(false);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const year = view.getFullYear();
  const month = view.getMonth();

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [year, month]);
  // Always 6 rows so the popup keeps the same size for every month.
  const weeks = 6;

  const shift = (delta: number) => setView(new Date(year, month + delta, 1));
  const canNext = new Date(year, month + 1, 1) <= maxDate;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxDate.getFullYear(); y >= minYear; y--) list.push(y);
    return list;
  }, [maxDate, minYear]);
  const yearListRef = useRef<FlatList<number>>(null);

  return (
    <AppModal visible={visible} onClose={onClose} hideClose>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <CloseButton onPress={onClose} />
        </View>

        <View style={styles.monthRow}>
          <Pressable style={styles.monthLabel} onPress={() => setPickYear((p) => !p)} accessibilityRole="button">
            <Text style={styles.month}>{MONTHS[month]}</Text>
            <Text style={styles.year}>{year}</Text>
          </Pressable>
          {!pickYear ? (
            <View style={styles.nav}>
              <Svg.IconCalendarNav />
              <Pressable
                style={[styles.navHit, { left: -8 }]}
                onPress={() => shift(-1)}
                accessibilityLabel="Previous month"
              />
              <Pressable
                style={[styles.navHit, { right: -8 }, !canNext && { opacity: 0.3 }]}
                onPress={() => canNext && shift(1)}
                accessibilityLabel="Next month"
              />
            </View>
          ) : null}
        </View>

        {pickYear ? (
          <FlatList
            ref={yearListRef}
            data={years}
            numColumns={4}
            keyExtractor={(y) => String(y)}
            style={styles.yearList}
            initialScrollIndex={Math.max(0, Math.floor(years.indexOf(year) / 4) - 2) * 4}
            getItemLayout={(_, index) => ({ length: 48, offset: 48 * Math.floor(index / 4), index })}
            renderItem={({ item }) => (
              <Pressable
                style={styles.yearCell}
                onPress={() => {
                  setView(new Date(item, Math.min(month, item === maxDate.getFullYear() ? maxDate.getMonth() : 11), 1));
                  setPickYear(false);
                }}
              >
                <Text style={[styles.yearCellText, item === year && { color: colors.main }]}>{item}</Text>
              </Pressable>
            )}
          />
        ) : (
          <View style={styles.grid}>
            <View style={styles.week}>
              {WEEKDAYS.map((d, i) => (
                <View key={i} style={styles.cell}>
                  <Text style={[styles.day, { color: colors.calendarMuted }]}>{d}</Text>
                </View>
              ))}
            </View>
            {Array.from({ length: weeks }).map((_, w) => (
              <View key={w} style={styles.week}>
                {cells.slice(w * 7, w * 7 + 7).map((d) => {
                  const inMonth = d.getMonth() === month;
                  const future = d > maxDate;
                  const isSel = sameDay(selected, d);
                  const label = (
                    <Text
                      style={[
                        styles.day,
                        (!inMonth || future) && { color: colors.calendarOut },
                        isSel && { color: colors.white },
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  );
                  return (
                    <Pressable
                      key={d.toISOString()}
                      style={styles.cell}
                      disabled={future}
                      onPress={() => {
                        setSelected(d);
                        if (!inMonth) setView(new Date(d.getFullYear(), d.getMonth(), 1));
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSel, disabled: future }}
                    >
                      {isSel ? (
                        <ImageBackground source={images.calendarSelected} style={styles.selected}>
                          {label}
                        </ImageBackground>
                      ) : (
                        label
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <Button
          title="Save"
          onPress={() => selected && onSave(selected)}
          disabled={!selected}
          style={styles.save}
        />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 17, paddingBottom: 19, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 28, color: colors.text },
  monthRow: {
    marginTop: 33,
    marginHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: { flexDirection: 'row', alignItems: 'flex-end', gap: 7.2 },
  month: { fontFamily: fonts.semibold, fontSize: 36, lineHeight: 37, color: colors.text },
  year: {
    fontFamily: fonts.calendar,
    fontSize: 16.27,
    lineHeight: 31.5,
    letterSpacing: -0.9,
    color: colors.calendarMuted,
  },
  nav: { width: 37.77, height: 16.27, justifyContent: 'center' },
  navHit: { position: 'absolute', top: -14, bottom: -14, width: 30 },
  grid: { marginTop: 22.6, gap: 21.7, height: GRID_HEIGHT },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { width: `${100 / 7}%`, height: 32, alignItems: 'center', justifyContent: 'center' },
  day: {
    fontFamily: fonts.calendar,
    fontSize: 18.07,
    lineHeight: 31.5,
    letterSpacing: -0.9,
    color: colors.text,
    textAlign: 'center',
  },
  selected: { width: 41, height: 41, alignItems: 'center', justifyContent: 'center' },
  // Same height as the day grid, so switching to the year list doesn't resize the popup either.
  yearList: { marginTop: 22.6, height: GRID_HEIGHT },
  yearCell: { width: '25%', height: 48, alignItems: 'center', justifyContent: 'center' },
  yearCellText: { fontFamily: fonts.calendar, fontSize: 18, color: colors.text },
  save: { marginTop: 32, marginHorizontal: 10 },
});
