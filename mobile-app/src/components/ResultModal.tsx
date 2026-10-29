import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Svg } from '../assets';
import { text } from '../theme';
import AppModal from './AppModal';
import Button from './Button';
import { ArrowIcon } from './Icons';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  buttonLabel: string;
  onPress: () => void;
  onClose?: () => void;
};

/** "Password Reset Successful" / "Account Created" popup with the party popper. */
export default function ResultModal({ visible, title, message, buttonLabel, onPress, onClose }: Props) {
  return (
    <AppModal visible={visible} onClose={onClose ?? onPress}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Svg.IllusParty />
          <View style={styles.texts}>
            <Text style={text.modalTitle}>{title}</Text>
            <Text style={[text.modalBody, styles.body]}>{message}</Text>
          </View>
        </View>
        <Button title={buttonLabel} onPress={onPress} right={<ArrowIcon />} style={styles.button} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: 22, paddingHorizontal: 24, paddingTop: 36, paddingBottom: 36 },
  top: { alignItems: 'center', gap: 30, width: '100%' },
  texts: { alignItems: 'center', gap: 5, width: '100%' },
  body: { maxWidth: 326 },
  button: { width: 186 },
});
