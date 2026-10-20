import type { Timestamp } from 'firebase/firestore';
import type { AccountStatus, UserDoc } from './types';

export const DEFAULT_COUNTRY_CODE = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE || '+92';

export function toDate(t?: Timestamp | null): Date | null {
  if (!t) return null;
  try {
    return t.toDate();
  } catch {
    return null;
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 2024-01-15 */
export function isoDay(t?: Timestamp | null): string {
  const d = toDate(t);
  return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '—';
}

/** 18 Jan 2026 */
export function longDay(t?: Timestamp | null): string {
  const d = toDate(t);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '—';
}

/** Jan 18, 2026 */
export function shortDay(t?: Timestamp | null): string {
  const d = toDate(t);
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : '—';
}

/** yyyy-mm-dd → 23-06-1996 */
export function dob(value?: string): string {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  return y && m && d ? `${d}-${m}-${y}` : value;
}

export function displayName(u: Pick<UserDoc, 'profile' | 'email'>): string {
  return u.profile?.fullName?.trim() || u.email || 'Unnamed user';
}

export function initial(u: Pick<UserDoc, 'profile' | 'email'>): string {
  return displayName(u).charAt(0).toUpperCase() || '?';
}

/** Short, stable ID shown as "User ID : 7F3K2A". */
export function shortId(uid: string): string {
  return uid.slice(0, 6).toUpperCase();
}

/** Same rules as the mobile app (src/utils/validation.ts): returns "+6591234567" or null. */
export function toE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (!hasPlus) {
    if (digits.startsWith('00')) digits = digits.slice(2);
    else digits = DEFAULT_COUNTRY_CODE.replace('+', '') + digits.replace(/^0+/, '');
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
export const isNric = (value: string) => /^[STFGM]\d{7}[A-Z]$/i.test(value.trim());

export function fileSize(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const STATUS_LABEL: Record<AccountStatus, string> = {
  incomplete: 'Incomplete',
  under_review: 'Pending',
  approved: 'Active',
  rejected: 'Rejected',
  blacklisted: 'Blacklisted',
};

export function sortByNewest(users: UserDoc[]): UserDoc[] {
  return [...users].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const symbols = '@#$%&*!';
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  let out = '';
  for (let i = 0; i < length - 2; i++) out += chars[values[i] % chars.length];
  out += symbols[values[length - 2] % symbols.length];
  out += String(values[length - 1] % 10);
  return out;
}
