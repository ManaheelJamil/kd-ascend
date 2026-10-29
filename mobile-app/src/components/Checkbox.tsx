import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Svg } from '../assets';
import { colors } from '../theme';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
  borderColor?: string;
  error?: boolean;
};

export default function Checkbox({ checked, onChange, label, borderColor = colors.text, error }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      hitSlop={8}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View
        style={[
          styles.box,
          { borderColor: error ? colors.error : borderColor },
          checked && { backgroundColor: colors.dark, borderColor: colors.dark },
        ]}
      >
        {checked ? (
          <View style={styles.tick}>
            <Svg.IconTickSmall />
          </View>
        ) : null}
      </View>
      {label}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  box: { width: 16, height: 16, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tick: { transform: [{ scale: 0.95 }] },
});
