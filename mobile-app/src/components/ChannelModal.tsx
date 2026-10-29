import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Svg } from '../assets';
import { colors, fonts, text } from '../theme';
import AppModal from './AppModal';
import { EmailIcon } from './Icons';

export type Channel = 'email' | 'sms';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (channel: Channel) => void;
  loading?: Channel | null;
  initial?: Channel;
};

/** "How would you like to receive the verification code?" */
export default function ChannelModal({ visible, onClose, onSelect, loading, initial = 'email' }: Props) {
  const [selected, setSelected] = useState<Channel>(initial);
  useEffect(() => {
    if (visible) setSelected(initial);
  }, [visible, initial]);

  const option = (channel: Channel, label: string, icon: React.ReactNode) => {
    const active = selected === channel;
    return (
      <Pressable
        onPress={() => {
          setSelected(channel);
          onSelect(channel);
        }}
        disabled={!!loading}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[styles.option, active ? styles.optionActive : styles.optionIdle]}
      >
        {loading === channel ? (
          <ActivityIndicator color={colors.main} />
        ) : (
          <View style={styles.optionRow}>
            {icon}
            <Text style={styles.optionLabel}>{label}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <AppModal visible={visible} onClose={loading ? undefined : onClose}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Svg.IllusKey />
          <Text style={text.modalTitle}>How would you like to receive the verification code?</Text>
        </View>
        <View style={styles.options}>
          {option('email', 'Via Email', <EmailIcon />)}
          {option('sms', 'Via SMS', <Svg.IconSms />)}
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingBottom: 36, paddingHorizontal: 24, alignItems: 'center', gap: 25 },
  top: { alignItems: 'center', gap: 30, width: '100%' },
  options: { flexDirection: 'row', gap: 13, width: '100%', justifyContent: 'center' },
  option: {
    flex: 1,
    maxWidth: 147,
    height: 68,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: { backgroundColor: colors.mainTint, borderWidth: 1, borderColor: colors.main },
  optionIdle: { backgroundColor: colors.greyBg },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  optionLabel: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18.48, color: colors.text },
});
