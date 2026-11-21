import React, { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import Text from '../components/AppText';
import AccountLayout from '../components/AccountLayout';
import { IconChevronRight } from '../components/AccountIcons';
import { FAQS } from '../services/supportService';
import { colors, fonts } from '../theme';
import type { ScreenProps } from '../navigation/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Speech bubble (Contact Admin). */
function IconChat() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c5 0 9 3.6 9 8s-4 8-9 8c-1.2 0-2.3-.2-3.3-.5L4 20l1.3-3.6C3.9 15 3 13.1 3 11c0-4.4 4-8 9-8Z"
        stroke={colors.text}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path d="M8.5 11h.01M12 11h.01M15.5 11h.01" stroke={colors.text} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/** Warning triangle outline (Report an Issue). */
function IconAlert() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M10.3 4.3a2 2 0 0 1 3.4 0l7.6 13.2A2 2 0 0 1 19.6 20H4.4a2 2 0 0 1-1.7-2.5L10.3 4.3Z" stroke={colors.text} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M12 9.5v4M12 16.8h.01" stroke={colors.text} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

function Chevron({ up }: { up: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={up ? undefined : { transform: [{ rotate: '180deg' }] }}>
      <Path d="m6 15 6-6 6 6" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LinkCard({ icon, title, text, onPress }: { icon: React.ReactNode; title: string; text: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.linkIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkText}>{text}</Text>
      </View>
      <IconChevronRight />
    </Pressable>
  );
}

/** Help & Support (Figma 196:4952): Contact Admin, Report an Issue and the FAQ. */
export default function HelpSupportScreen({ navigation }: ScreenProps<'HelpSupport'>) {
  const [open, setOpen] = useState<number | null>(0);

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => (o === i ? null : i));
  };

  return (
    <AccountLayout title="Help & Support" onBack={() => navigation.goBack()} contentTop={39}>
      <View style={{ gap: 14 }}>
        <LinkCard
          icon={<IconChat />}
          title="Contact Admin"
          text="Get help with your account or bookings"
          onPress={() => navigation.navigate('ContactAdmin')}
        />
        <LinkCard
          icon={<IconAlert />}
          title="Report an Issue"
          text="Something not working correctly?"
          onPress={() => navigation.navigate('ReportIssue')}
        />
      </View>

      <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
      <View style={{ gap: 14 }}>
        {FAQS.map((f, i) => {
          const on = open === i;
          return (
            <View key={f.q} style={styles.faq}>
              <Pressable
                onPress={() => toggle(i)}
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
                style={styles.faqHead}
              >
                <Text style={styles.faqQ}>{f.q}</Text>
                <Chevron up={on} />
              </Pressable>
              {on ? <Text style={styles.faqA}>{f.a}</Text> : null}
            </View>
          );
        })}
      </View>
    </AccountLayout>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: colors.greyBg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24, color: colors.text },
  linkText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.grey },
  faqTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.text, marginTop: 30, marginBottom: 16 },
  faq: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 14 },
  faqHead: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  faqQ: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.text },
  faqA: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.grey, paddingBottom: 12, marginTop: -4 },
});
