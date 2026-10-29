import React from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Svg } from '../assets';
import { colors } from '../theme';

export function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Close"
      style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}
    >
      <View style={StyleSheet.absoluteFill}>
        <Svg.IconCloseBg />
      </View>
      <Svg.IconClose />
    </Pressable>
  );
}

type Props = {
  visible: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  cardStyle?: StyleProp<ViewStyle>;
  /** Hide the built-in top-right close button (when the content draws its own header). */
  hideClose?: boolean;
};

/** Centred white card on a 22% black scrim — matches every popup in the design. */
export default function AppModal({ visible, onClose, children, cardStyle, hideClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={[styles.card, cardStyle]}>
          {children}
          {onClose && !hideClose ? (
            <View style={styles.closePos}>
              <CloseButton onPress={onClose} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 390, backgroundColor: colors.white, borderRadius: 20, overflow: 'hidden' },
  closePos: { position: 'absolute', top: 19, right: 26 },
  close: { width: 33, height: 33, alignItems: 'center', justifyContent: 'center' },
});
