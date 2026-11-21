import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import AccountLayout from '../components/AccountLayout';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_NOTIF_SETTINGS,
  SETTING_ROWS,
  loadNotifSettings,
  saveNotifSettings,
  type NotifSettings,
} from '../services/notificationsService';
import { colors, fonts } from '../theme';
import type { ScreenProps } from '../navigation/types';

/** Dark pill switch from the design (on: navy, off: light grey). */
function NavySwitch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      style={[styles.track, { backgroundColor: value ? colors.dark : '#E0E0E0' }]}
    >
      <View style={[styles.knob, value ? { right: 3 } : { left: 3 }]} />
    </Pressable>
  );
}

/** Notification Settings (Figma 196:4900). Saved on this phone; they decide what shows in Notifications. */
export default function NotificationSettingsScreen({ navigation }: ScreenProps<'NotificationSettings'>) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [saved, setSaved] = useState<NotifSettings>(DEFAULT_NOTIF_SETTINGS);
  const [draft, setDraft] = useState<NotifSettings>(DEFAULT_NOTIF_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;
    void loadNotifSettings(uid).then((s) => {
      setSaved(s);
      setDraft(s);
    });
  }, [uid]);

  const changed = SETTING_ROWS.some((r) => draft[r.key] !== saved[r.key]);

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await saveNotifSettings(uid, draft);
      setSaved(draft);
      Alert.alert('Saved', 'Your notification settings have been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Couldn’t save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountLayout
      title="Notification Settings"
      onBack={() => navigation.goBack()}
      contentTop={39}
      footer={<Button title="Save Changes" onPress={save} loading={saving} disabled={!changed} />}
    >
      <View style={{ gap: 14 }}>
        {SETTING_ROWS.map((r) => (
          <View key={r.key} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{r.title}</Text>
              <Text style={styles.text}>{r.text}</Text>
            </View>
            <NavySwitch
              label={r.title}
              value={draft[r.key]}
              onChange={(v) => setDraft((d) => ({ ...d, [r.key]: v }))}
            />
          </View>
        ))}
      </View>
    </AccountLayout>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: colors.greyBg,
    paddingHorizontal: 17,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24, color: colors.text },
  text: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.grey },
  track: { width: 40, height: 22, borderRadius: 11, justifyContent: 'center' },
  knob: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: colors.white },
});
