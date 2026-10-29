import { StyleSheet } from 'react-native';

/** Tokens taken from the Figma variables (--main-color, --dark-color, …). */
export const colors = {
  main: '#FF8241',
  mainTint: 'rgba(255,130,65,0.09)',
  dark: '#242239',
  text: '#060702',
  grey: '#5E5E5E',
  greyBg: '#F6F6F6',
  stroke: '#E0E0E0',
  otpBorder: '#D0D0D0',
  otpErrorBorder: '#FF4848',
  error: '#FF3737',
  errorText: '#FF0000',
  errorBg: 'rgba(255,43,43,0.08)',
  green: '#4DCD85',
  stepIdle: 'rgba(224,224,224,0.62)',
  stepIdleText: '#A7A7A7',
  calendarMuted: '#707070',
  calendarOut: 'rgba(0,0,0,0.28)',
  overlay: 'rgba(0,0,0,0.22)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  calendar: 'Montserrat_500Medium',
} as const;

/** Layout constants from the 430pt-wide frames. */
export const layout = {
  headerHeight: 185,
  gutter: 20,
  sheetRadius: 20,
  fieldGap: 25,
  radius: 12,
} as const;

export const text = StyleSheet.create({
  title: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 33.6, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 21.12, color: colors.grey },
  label: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 21.12, color: colors.text },
  input: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  placeholder: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18.48, color: colors.grey },
  fieldError: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17.16, color: colors.errorText },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17.16, color: colors.grey },
  linkMedium: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18.48, color: colors.text },
  link: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 19.8,
    color: colors.main,
    textDecorationLine: 'underline',
  },
  button: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  modalTitle: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 30.8, color: colors.text, textAlign: 'center' },
  modalBody: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 21.12, color: colors.grey, textAlign: 'center' },
});
