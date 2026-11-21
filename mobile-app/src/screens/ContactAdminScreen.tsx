import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import AccountLayout from '../components/AccountLayout';
import { IconHelp, IconPerson } from '../components/AccountIcons';
import { useAuth } from '../context/AuthContext';
import { config } from '../config';
import { getSupportInfo, phoneDigits, type SupportInfo } from '../services/supportService';
import { colors, fonts } from '../theme';
import type { ScreenProps } from '../navigation/types';

/** Dark "Need help…" banner shared with Report an Issue (Figma 196:5022 / 196:5071). */
export function InfoBanner({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerIcon}>
        <IconHelp size={20} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerText}>{text}</Text>
      </View>
    </View>
  );
}

function ContactRow({ title, value, onPress }: { title: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${title}: ${value}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <View style={styles.rowIcon}>
        <IconPerson size={20} color={colors.dark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </Pressable>
  );
}

/** Contact Admin (Figma 196:5022): email and WhatsApp / phone of the admin team. */
export default function ContactAdminScreen({ navigation }: ScreenProps<'ContactAdmin'>) {
  const { user, profile } = useAuth();
  const [info, setInfo] = useState<SupportInfo | null>(null);

  useEffect(() => {
    let alive = true;
    void getSupportInfo().then((i) => alive && setInfo(i));
    return () => {
      alive = false;
    };
  }, []);

  const name = profile?.profile?.fullName || user?.email || '';

  const open = async (url: string, fallback: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Couldn’t open', fallback);
    }
  };

  const email = () => {
    if (!info?.email) return;
    const subject = encodeURIComponent(`${config.appName} support`);
    const body = encodeURIComponent(`Hi, this is ${name} (${user?.email ?? ''}).\n\n`);
    void open(`mailto:${info.email}?subject=${subject}&body=${body}`, `Please email us at ${info.email}.`);
  };

  const whatsapp = () => {
    if (!info?.phone) return;
    const digits = phoneDigits(info.phone).replace(/^\+/, '');
    Alert.alert('Contact Admin', info.phone, [
      { text: 'WhatsApp', onPress: () => void open(`https://wa.me/${digits}`, `Please message us on ${info.phone}.`) },
      { text: 'Call', onPress: () => void open(`tel:${phoneDigits(info.phone ?? '')}`, `Please call us on ${info.phone}.`) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <AccountLayout title="Contact Admin" onBack={() => navigation.goBack()} contentTop={30}>
      <InfoBanner
        title="Need help with your account or bookings?"
        text="Reach out to our admin team and we’ll assist you as soon as possible."
      />
      <View style={styles.list}>
        {!info ? (
          <ActivityIndicator color={colors.main} style={{ marginTop: 20 }} />
        ) : (
          <>
            {info.email ? <ContactRow title="Email Support" value={info.email} onPress={email} /> : null}
            {info.email && info.phone ? <View style={styles.line} /> : null}
            {info.phone ? <ContactRow title="WhatsApp / Phone" value={info.phone} onPress={whatsapp} /> : null}
            {!info.email && !info.phone ? (
              <Text style={styles.none}>
                Contact details aren’t available right now. Please use Report an Issue and the admin team will get back to you.
              </Text>
            ) : null}
          </>
        )}
      </View>
    </AccountLayout>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    backgroundColor: colors.dark,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 22, color: colors.white },
  bannerText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: 'rgba(255,255,255,0.85)' },
  list: { marginTop: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
  rowIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.greyBg, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24, color: colors.text },
  rowValue: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.grey },
  line: { height: 1, backgroundColor: 'rgba(224,224,224,0.7)', marginVertical: 14 },
  none: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.grey },
});
