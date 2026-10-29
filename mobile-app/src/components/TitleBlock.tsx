import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { text } from '../theme';

export default function TitleBlock({
  title,
  subtitle,
  style,
}: {
  title: string;
  subtitle?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={text.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={[text.subtitle, styles.subtitle]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 5 },
  subtitle: { maxWidth: 354 },
});
