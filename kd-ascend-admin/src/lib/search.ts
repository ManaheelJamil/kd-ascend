import { displayName } from './format';
import type { UserDoc } from './types';

const digits = (s: string) => s.replace(/\D/g, '');

/**
 * Forgiving user search used on the Users page.
 * - Name, email, NRIC and user ID: case-insensitive "contains", word by word
 *   (e.g. "rizwan gmail" finds Rizwan with a Gmail address).
 * - Phone: digits only, so "+92 345-4671224", "923454671224" and the local "03454671224"
 *   all find the same number (+923454671224).
 */
export function userMatches(u: UserDoc, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const text = [displayName(u), u.profile?.fullName, u.email, u.profile?.nric, u.uid, u.phone]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const phone = digits(u.phone ?? '');

  // A query that is mostly a phone number (digits, spaces, +, -, brackets).
  const qDigits = digits(q);
  if (qDigits.length >= 3 && /^[\d\s+\-()]+$/.test(q) && phone) {
    const local = qDigits.replace(/^0+/, ''); // 0345… → 345…
    if (phone.includes(qDigits) || (local.length >= 3 && phone.includes(local))) return true;
  }

  // Every word must appear somewhere (name, email, NRIC, ID or phone).
  return q.split(/\s+/).every((word) => {
    if (text.includes(word)) return true;
    const wd = digits(word);
    return wd.length >= 3 && phone.includes(wd.replace(/^0+/, ''));
  });
}
