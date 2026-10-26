/**
 * Fields an admin can ask a blocked / rejected user to fix. The user sees a "Resubmit" button in
 * the app with everything pre-filled, and can only change these fields. Keep in sync with the
 * mobile app (src/services/resubmit.ts).
 */
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

export const resubmitLabels = (keys?: readonly string[] | null) => (keys ?? []).map(resubmitLabel).join(', ');
