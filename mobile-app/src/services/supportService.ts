/**
 * Help & Support (Figma 196:4952, 196:5022, 196:5071). Both calls go to the dashboard server
 * (kd-ascend-admin/src/server/support.ts): it knows the admin's contact details and emails reports.
 */
import { callFunction } from '../firebase';
import { config } from '../config';

export const ISSUE_TYPES = ['Booking Issue', 'Payment Issue', 'Account Issue', 'App Problem', 'Other'] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export type SupportInfo = { email: string | null; phone: string | null };

/** Where to reach the admin team. Falls back to the app's config if the server can't be reached. */
export async function getSupportInfo(): Promise<SupportInfo> {
  try {
    const info = await callFunction<SupportInfo>('supportInfo', {});
    return { email: info.email || config.supportEmail || null, phone: info.phone || null };
  } catch {
    return { email: config.supportEmail || null, phone: null };
  }
}

/** Saves the report for the admin and emails it to the support inbox. */
export const reportIssue = (type: IssueType, message: string) =>
  callFunction<{ status: 'sent'; id: string }>('reportIssue', { type, message });

export const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I verify my account?',
    a: 'To verify your account, please complete the onboarding process and submit the required documents.',
  },
  {
    q: 'When will I get paid?',
    a: 'After your shift, the admin checks your hours and processes the payout to your PayNow or bank account. You can follow each payment under Earnings: Pending → Processing → Paid.',
  },
  {
    q: 'How do I cancel a booking?',
    a: 'Open Bookings, choose the booking and tap Cancel Booking. Cancelling less than 24 hours before the job starts results in a $50 penalty.',
  },
  {
    q: 'Why is my account status unverified?',
    a: 'Your account shows Unverified while the admin reviews new details, for example after you edit your profile or upload a new document. This usually takes 1–3 business days.',
  },
];

/** "+65 9123 4567" → digits for wa.me / tel: links. */
export const phoneDigits = (phone: string) => phone.replace(/[^\d+]/g, '');
