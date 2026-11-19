import type { Timestamp } from 'firebase/firestore';

/**
 * Account lifecycle (shared with the mobile app, see hireloop-app/src/services/userService.ts):
 *  incomplete   – signed up, still filling in the onboarding steps
 *  under_review – submitted, waiting for an admin ("Pending")
 *  approved     – admin approved; the user can use the app ("Active")
 *  rejected     – admin rejected the application
 *  blacklisted  – admin blocked the user; the app locks them out
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
  /** Set by an admin when reviewing the document. */
  status?: 'verified' | 'rejected';
  label?: string;
};

export type Payout =
  | { method: 'paynow'; paynowName: string; paynowId: string }
  | {
      method: 'bank';
      bankName: string;
      accountHolderName: string;
      accountNumber: string;
      statement?: StoredFile | null;
    };

export type UserDoc = {
  uid: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  onboardingStep: 'personal' | 'identity' | 'payout' | 'done';
  status: AccountStatus;
  profile?: PersonalInfo;
  identityDocument?: StoredFile | null;
  /** Extra documents added by an admin. */
  documents?: StoredFile[];
  payout?: Payout;
  testVerification?: { phone?: boolean; email?: boolean };
  createdBy?: 'app' | 'admin';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  submittedAt?: Timestamp | null;
  approvedAt?: Timestamp | null;
  approvedBy?: string;
  rejectedAt?: Timestamp | null;
  rejectedBy?: string;
  rejectionReason?: string;
  blacklistedAt?: Timestamp | null;
  blacklistedBy?: string;
  blacklistReason?: string;
  /** Fields the admin asked the user to fix (Resubmit in the app). See lib/resubmit.ts. */
  resubmitFields?: string[];
  /** Set by the app when a blocked / rejected user resubmits: the status they came from. */
  resubmittedFrom?: 'blacklisted' | 'rejected';
  resubmittedAt?: Timestamp | null;
};

export type StatusFilter = 'all' | AccountStatus;
