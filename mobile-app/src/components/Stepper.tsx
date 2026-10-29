import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Svg } from '../assets';
import { colors, fonts } from '../theme';

/** 1 — 2 — 3 progress row on the onboarding screens. `current` is 1-based. */
export default function Stepper({ current, total = 3 }: { current: number; total?: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`Step ${current} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <React.Fragment key={step}>
            {i > 0 ? (
              <View style={styles.connectorWrap}>
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: done ? colors.green : active ? colors.dark : colors.stroke },
                  ]}
                />
              </View>
            ) : null}
            <View style={[styles.circle, done ? styles.done : active ? styles.active : styles.idle]}>
              {done ? (
                <View style={styles.tick}>
                  <Svg.IconTickStep />
                </View>
              ) : (
                <Text style={[styles.num, { color: active ? colors.white : colors.stepIdleText }]}>{step}</Text>
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const SIZE = 37.42;
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  circle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: colors.green },
  active: { backgroundColor: colors.dark },
  idle: { backgroundColor: colors.stepIdle },
  tick: { position: 'absolute', left: 6, top: 6.07 },
  num: { fontFamily: fonts.semibold, fontSize: 20.8, lineHeight: 29.1, textAlign: 'center' },
  // 41 gap + 56 line + 41 gap between circles in the frame → line is ~40% of the gap
  connectorWrap: { flex: 1, alignItems: 'center' },
  connector: { width: '40.6%', height: 3, borderRadius: 100 },
});
