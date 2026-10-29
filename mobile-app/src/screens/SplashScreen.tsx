import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { images } from '../assets';
import { colors } from '../theme';

/** Figma "Splash": doodles top-left and bottom-left, logo centred. */
export default function SplashScreen() {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(418, width - 12);
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image source={images.doodleSplashTop} style={styles.top} />
      <Image source={images.doodleSplashBottom} style={styles.bottom} />
      <Image
        source={images.logo}
        style={{ width: logoWidth, height: logoWidth * (274.23 / 418) }}
        resizeMode="cover"
        accessibilityLabel="KD Ascend"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  top: { position: 'absolute', left: 0, top: 0, width: 791.16, height: 372.24 },
  bottom: { position: 'absolute', left: -361, bottom: 0, width: 791.16, height: 372.24 },
});
