/**
 * Resubmit after an admin blocked / rejected the account.
 * The admin ticks the fields to fix (dashboard: lib/resubmit.ts — keep the keys in sync);
 * the app shows everything pre-filled and only those fields can be changed.
 */
import { serverTimestamp, updateDoc } from '@react-native-firebase/firestore';
import { userRef, type PersonalInfo, type StoredFile } from './userService';

export const RESUBMIT_FIELDS = [
  { key: 'fullName', label: 'Full Name' },
  { key: 'nric', label: 'NRIC' },
  { key: 'gender', label: 'Gender' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'placeOfBirth', label: 'Place of Birth' },
  { key: 'address', label: 'Address' },
  { key: 'identityDocument', label: 'Identity Document' },
  { key: 'payout', label: 'Payment Details' },
] as const;

export type ResubmitField = (typeof RESUBMIT_FIELDS)[number]['key'];

export const resubmitLabel = (key: string) => RESUBMIT_FIELDS.find((f) => f.key === key)?.label ?? key;

/** Sends the corrected details back to the admin. The account waits for review again. */
export function resubmitApplication(
  uid: string,
  from: 'blacklisted' | 'rejected',
  changes: { profile: PersonalInfo; identityDocument?: StoredFile },
) {
  return updateDoc(userRef(uid), {
    profile: changes.profile,
    ...(changes.identityDocument ? { identityDocument: changes.identityDocument } : {}),
    status: 'under_review',
    resubmittedFrom: from,
    resubmittedAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
