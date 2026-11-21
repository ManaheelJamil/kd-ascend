import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  // Signed out
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetVerify:
    | { channel: 'sms'; phone: string }
    | { channel: 'email'; identifier: string; destination: string; cooldownSeconds?: number; lockedSeconds?: number };
  CreateNewPassword: { mode: 'sms' } | { mode: 'email'; resetToken: string };

  // Signed in, onboarding
  VerifyPhone: undefined;
  VerifyEmail: undefined;
  PersonalInfo: undefined;
  IdentityUpload: undefined;
  PayoutMethod: undefined;
  PayNowDetails: undefined;
  BankDetails: undefined;

  // Signed in, waiting for approval / rejected / blacklisted
  AccountStatus: undefined;
  Resubmit: undefined;

  // Signed in, approved
  Home: undefined;
  Account: undefined;
  // Jobs module
  JobSearch: undefined;
  JobDetail: { jobId: string };
  Bookings: { tab?: 'upcoming' | 'past' } | undefined;
  BookingDetail: { jobId: string };
  // Account module
  EditProfile: undefined;
  IdentityDocuments: undefined;
  UploadDocument: undefined;
  PaymentDetails: undefined;
  NotificationSettings: undefined;
  HelpSupport: undefined;
  ContactAdmin: undefined;
  ReportIssue: undefined;
  // Earnings & notifications
  Earnings: undefined;
  Notifications: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type OnboardingRoute =
  | 'VerifyPhone'
  | 'VerifyEmail'
  | 'PersonalInfo'
  | 'IdentityUpload'
  | 'PayoutMethod'
  | 'PayNowDetails'
  | 'BankDetails';
