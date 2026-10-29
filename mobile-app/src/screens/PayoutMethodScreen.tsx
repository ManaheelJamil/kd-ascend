import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import TitleBlock from '../components/TitleBlock';
import Button from '../components/Button';
import Stepper from '../components/Stepper';
import { ArrowIcon, BankIcon } from '../components/Icons';
import { images, Svg } from '../assets';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, layout } from '../theme';
import type { ScreenProps } from '../navigation/types';

type Method = 'paynow' | 'bank';

function Radio({ on }: { on: boolean }) {
  return on ? <Svg.IconRadioOn /> : <View style={styles.radioOff} />;
}

export default function PayoutMethodScreen({ navigation }: ScreenProps<'PayoutMethod'>) {
  const { profile } = useAuth();
  const [method, setMethod] = useState<Method>(profile?.payout?.method ?? 'paynow');

  const onBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('IdentityUpload'));
  const onContinue = () => navigation.navigate(method === 'paynow' ? 'PayNowDetails' : 'BankDetails');

  return (
    <AuthLayout
      sheetPaddingTop={30}
      footer={
        <View style={styles.footer}>
          <Button title="Back" variant="outline" onPress={onBack} left={<ArrowIcon dark left />} style={styles.half} />
          <Button title="Continue" onPress={onContinue} style={styles.half} />
        </View>
      }
    >
      <Stepper current={3} />
      <TitleBlock style={styles.title} title="Set Up Your Payout Method" subtitle="Choose your payment method." />

      <View style={styles.options} accessibilityRole="radiogroup">
        <Pressable
          style={styles.option}
          onPress={() => setMethod('paynow')}
          accessibilityRole="radio"
          accessibilityState={{ checked: method === 'paynow' }}
          accessibilityLabel="PayNow"
        >
          <Image source={images.paynow} style={styles.paynow} resizeMode="cover" />
          <Radio on={method === 'paynow'} />
        </Pressable>
        <Pressable
          style={[styles.option, styles.bankOption]}
          onPress={() => setMethod('bank')}
          accessibilityRole="radio"
          accessibilityState={{ checked: method === 'bank' }}
        >
          <View style={styles.bankLabel}>
            <BankIcon />
            <Text style={styles.bankText}>Bank Transfer</Text>
          </View>
          <Radio on={method === 'bank'} />
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 26 },
  options: { marginTop: 32, gap: 18 },
  option: {
    height: 48,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.stroke,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 17,
    paddingRight: 13,
  },
  bankOption: { paddingLeft: 15 },
  paynow: { width: 90, height: 17.54 },
  bankLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bankText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18.48, color: colors.black },
  radioOff: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.11, borderColor: colors.dark },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 18 },
  half: { flex: 1, maxWidth: 186 },
});
