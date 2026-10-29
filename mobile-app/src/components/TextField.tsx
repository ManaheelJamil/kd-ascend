import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Svg } from '../assets';
import { colors, layout, text } from '../theme';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  /** Adds the orange eye toggle (password fields). */
  password?: boolean;
  /** Icon on the right (chevron for selects, calendar for dates). */
  right?: React.ReactNode;
  /** Element before the text (country code picker on the phone field). */
  left?: React.ReactNode;
  /** Turns the field into a tappable picker (select / date) that shows `value` or the placeholder. */
  onPressField?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, password, right, left, onPressField, containerStyle, value, placeholder, ...inputProps },
  ref,
) {
  const [hidden, setHidden] = useState(true);
  const boxStyle = [styles.box, !!error && styles.boxError];

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={text.label}>{label}</Text>

      {onPressField ? (
        <Pressable
          onPress={onPressField}
          style={boxStyle}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value || placeholder || ''}`}
        >
          <Text style={[value ? styles.valueText : text.placeholder, styles.flex]} numberOfLines={1}>
            {value || placeholder}
          </Text>
          {right ? <View style={styles.right}>{right}</View> : null}
        </Pressable>
      ) : (
        <View style={boxStyle}>
          {left ? <View style={styles.left}>{left}</View> : null}
          <TextInput
            {...inputProps}
            ref={ref}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={colors.grey}
            secureTextEntry={password ? hidden : inputProps.secureTextEntry}
            autoCapitalize={password ? 'none' : inputProps.autoCapitalize}
            autoCorrect={password ? false : inputProps.autoCorrect}
            style={styles.input}
          />
          {password ? (
            <Pressable
              onPress={() => setHidden((h) => !h)}
              hitSlop={12}
              style={[styles.right, !hidden && { opacity: 0.45 }]}
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            >
              <Svg.IconEye />
            </Pressable>
          ) : right ? (
            <View style={styles.right}>{right}</View>
          ) : null}
        </View>
      )}

      {error ? <Text style={text.fieldError}>{error}</Text> : null}
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  wrap: { gap: 12, width: '100%' },
  box: {
    height: 48,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.stroke,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 14,
    overflow: 'hidden',
  },
  boxError: { borderColor: colors.error, backgroundColor: colors.errorBg },
  input: {
    ...text.input,
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    includeFontPadding: false,
  },
  valueText: { ...text.input, lineHeight: 18.48 },
  flex: { flex: 1 },
  left: { marginRight: 10, alignSelf: 'stretch', justifyContent: 'center' },
  right: { marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
});
