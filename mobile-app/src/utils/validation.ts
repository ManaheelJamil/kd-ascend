import { config } from '../config';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (value: string) => EMAIL_RE.test(value.trim());

/** Countries the app accepts phone numbers from (SMS codes are only sent to these). */
export const COUNTRIES = [
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰', example: '3001234567', mobile: /^3\d{9}$/ },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬', example: '81234567', mobile: /^[89]\d{7}$/ },
] as const;
export type Country = (typeof COUNTRIES)[number];
export const countryByCode = (code: string): Country => COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
export const defaultCountry = (): Country =>
  COUNTRIES.find((c) => c.dial === config.defaultCountryCode) ?? COUNTRIES[0];

/**
 * Turns what the user typed into +E.164 for a supported country, or null.
 *  - "+92 300 1234567" / "+65 8123 4567" → taken as is (must be PK or SG)
 *  - "0300 1234567" or "3001234567" with Pakistan selected → +923001234567
 *  - "8123 4567" with Singapore selected → +6581234567
 * Without a selected country (Forgot Password), local numbers are recognised by their shape.
 */
export function toE164(raw: string, country?: Country): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (trimmed.startsWith('+') || digits.startsWith('00')) {
    if (digits.startsWith('00')) digits = digits.slice(2);
    const c = COUNTRIES.find((x) => digits.startsWith(x.dial.slice(1)));
    if (!c) return null;
    const national = digits.slice(c.dial.length - 1).replace(/^0+/, '');
    return c.mobile.test(national) ? `${c.dial}${national}` : null;
  }
  const national = digits.replace(/^0+/, '');
  const candidates = country ? [country] : COUNTRIES;
  for (const c of candidates) {
    // Numbers typed with the country code but no "+" (e.g. 923001234567 / 6581234567).
    if (national.startsWith(c.dial.slice(1)) && c.mobile.test(national.slice(c.dial.length - 1))) {
      return `${c.dial}${national.slice(c.dial.length - 1)}`;
    }
    if (c.mobile.test(national)) return `${c.dial}${national}`;
  }
  return null;
}

export const isPhone = (value: string, country?: Country) => toE164(value, country) !== null;

export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'Please enter your email address.';
  return isEmail(value) ? null : 'Please enter a valid email address.';
}

export function validatePhone(value: string, country?: Country): string | null {
  if (!value.trim()) return 'Please enter your phone number.';
  if (isPhone(value, country)) return null;
  return country
    ? `Please enter a valid ${country.name} mobile number (e.g. ${country.example}).`
    : 'Please enter a valid Pakistan or Singapore mobile number.';
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Please enter a password.';
  return value.length >= 8 ? null : 'Password must be at least 8 characters';
}

export function validateConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password.';
  return password === confirm ? null : 'Passwords do not match.';
}

export const required = (value: string | null | undefined, message: string) =>
  value && String(value).trim() ? null : message;

/** Singapore NRIC / FIN: letter + 7 digits + letter (S1234567D). */
export function validateNric(value: string): string | null {
  if (!value.trim()) return 'Please enter your NRIC.';
  return /^[STFGM]\d{7}[A-Z]$/i.test(value.trim()) ? null : 'Please enter a valid NRIC / FIN.';
}

export const hasErrors = (errors: Record<string, string | null | undefined>) =>
  Object.values(errors).some(Boolean);
