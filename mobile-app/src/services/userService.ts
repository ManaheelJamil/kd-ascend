import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { db } from '../firebase';

export type OnboardingStep = 'personal' | 'identity' | 'payout' | 'done';
/**
 * incomplete   – still filling in the sign-up steps
 * under_review – submitted, waiting for an admin to approve
 * approved     – approved by an admin: the only status that can use the app
 * rejected     – application rejected by an admin (see rejectionReason)
 * blacklisted  – blocked by an admin (see blacklistReason); locked out of the app
 * Only the admin dashboard can set approved / rejected / blacklisted (see firestore.rules).
 */
export type AccountStatus = 'incomplete' | 'under_review' | 'approved' | 'rejected' | 'blacklisted';

export type PersonalInfo = {
  fullName: string;
  nric: string;
  gender: string;
  nationality: string;
  /** yyyy-mm-dd */
  dateOfBirth: string;
  placeOfBirth: string;
  address: string;
};

export type StoredFile = {
  path: string;
  name: string;
  contentType: string;
  size: number | null;
  /** Set by an admin in the dashboard. Missing = waiting for review. */
  status?: 'verified' | 'rejected';
  /** Document type picked by the user, e.g. "Student Pass". */
  label?: string;
  /** When the user uploaded it / when an admin reviewed it (Firestore Timestamps). */
  uploadedAt?: unknown;
  reviewedAt?: unknown;
};

export type Payout =
  | { method: 'paynow'; paynowName: string; paynowId: string }
  | {
      method: 'bank';
      bankName: string;
      accountHolderName: string;
      accountNumber: string;
      statement: StoredFile;
    };

export type UserDoc = {
  uid: string;
  email: string;
  phone: string;
  /** Written by the client after Firebase links the phone (Firestore rules check the token). */
  phoneVerified: boolean;
  /** Written only by the verifyEmailCode Cloud Function. */
  emailVerified: boolean;
  onboardingStep: OnboardingStep;
  status: AccountStatus;
  profile?: PersonalInfo;
  identityDocument?: StoredFile;
  payout?: Payout;
  /** Test OTP mode only (see services/devOtp.ts). */
  testVerification?: { phone?: boolean; email?: boolean };
  /** Written by the admin dashboard. */
  rejectionReason?: string;
  blacklistReason?: string;
  createdBy?: 'app' | 'admin';
  /** Set when an admin approves the account; stays after a later profile update is re-reviewed. */
  approvedAt?: unknown;
  /** Fields the admin asked a blocked / rejected user to fix (see services/resubmit.ts). */
  resubmitFields?: string[];
  /** Status the user resubmitted from; cleared by the admin when they approve again. */
  resubmittedFrom?: 'blacklisted' | 'rejected';
  resubmittedAt?: unknown;
};

const userRef = (uid: string) => doc(db, 'users', uid);

export function createUserDoc(uid: string, email: string, phone: string) {
  return setDoc(
    userRef(uid),
    {
      uid,
      email,
      phone,
      phoneVerified: false,
      emailVerified: false,
      onboardingStep: 'personal',
      status: 'incomplete',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export const markPhoneVerified = (uid: string) =>
  updateDoc(userRef(uid), { phoneVerified: true, updatedAt: serverTimestamp() });

export const savePersonalInfo = (uid: string, profile: PersonalInfo) =>
  updateDoc(userRef(uid), { profile, onboardingStep: 'identity', updatedAt: serverTimestamp() });

export const saveIdentityDocument = (uid: string, identityDocument: StoredFile) =>
  updateDoc(userRef(uid), { identityDocument, onboardingStep: 'payout', updatedAt: serverTimestamp() });

/**
 * Final step: the account goes to admin review. If an admin already approved the account
 * while it was being filled in, the status is left as it is.
 */
export async function submitApplication(uid: string, payout: Payout) {
  const snap = await getDoc(userRef(uid));
  const current = (snap.data() as UserDoc | undefined)?.status;
  return updateDoc(userRef(uid), {
    payout,
    onboardingStep: 'done',
    ...(current === 'incomplete' || current === undefined ? { status: 'under_review' } : {}),
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/* ---------- Account section (after approval) ---------- */

// DEV BRANCH (Account section off): Edit Profile / Upload Document helpers.
// /**
//  * Edit Profile: saves the new details and sends the account back to admin review
//  * ("Your account status will be temporarily set to Unverified"). The user keeps using the app.
//  */
// export const updateProfileForReview = (uid: string, profile: PersonalInfo) =>
//   updateDoc(userRef(uid), {
//     profile,
//     status: 'under_review',
//     submittedAt: serverTimestamp(),
//     updatedAt: serverTimestamp(),
//   });

// /** Identity Documents → Upload: replaces the document and sends it for admin review. */
// export const replaceIdentityDocument = (uid: string, file: StoredFile, label: string) =>
//   updateDoc(userRef(uid), {
//     identityDocument: { ...file, label, uploadedAt: serverTimestamp() },
//     status: 'under_review',
//     submittedAt: serverTimestamp(),
//     updatedAt: serverTimestamp(),
//   });

/** Payment Details: switch between PayNow and bank transfer or change the details. */
export const updatePayout = (uid: string, payout: Payout) =>
  updateDoc(userRef(uid), { payout, updatedAt: serverTimestamp() });

export { userRef };
