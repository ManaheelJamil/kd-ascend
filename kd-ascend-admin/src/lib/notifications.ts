import { displayName, initial, toDate } from './format';
import type { UserDoc } from './types';

export type NotificationKind = 'signup' | 'pending' | 'resubmitted' | 'approved' | 'rejected' | 'blacklisted';

export type AdminNotification = {
  /** Stable id for one event (user + kind + time), used for read state. */
  key: string;
  kind: NotificationKind;
  uid: string;
  title: string;
  subtitle: string;
  letter: string;
  at: Date;
  /** Admin email for admin decisions, so the admin who made one isn't notified about it. */
  by?: string;
};

/** How many notifications the panel keeps (newest first). */
export const NOTIFICATION_LIMIT = 40;

/**
 * Builds the notification feed from the live users list: every sign-up, profile submitted for
 * approval, resubmission, approval, rejection and blacklisting is one entry.
 * `adminName` turns the email saved on a decision (approvedBy / rejectedBy / blacklistedBy)
 * into a display name; `me` is the signed-in admin's email ("You").
 */
export function buildNotifications(
  users: UserDoc[],
  adminName: (email: string) => string,
  me: string | null,
): AdminNotification[] {
  const items: AdminNotification[] = [];
  const who = (email?: string) => {
    if (!email) return 'An admin';
    if (me && email.toLowerCase() === me.toLowerCase()) return 'You';
    return adminName(email);
  };

  for (const u of users) {
    const name = displayName(u);
    const letter = initial(u);
    const push = (kind: NotificationKind, at: Date | null, title: string, subtitle: string, by?: string) => {
      if (!at) return;
      items.push({ key: `${kind}:${u.uid}:${at.getTime()}`, kind, uid: u.uid, title, subtitle, letter, at, by });
    };

    if (u.createdBy !== 'admin') {
      push('signup', toDate(u.createdAt), `${name} created an account`, u.email || u.phone || 'New sign-up from the app');
    }
    if (u.status === 'under_review' && u.resubmittedFrom) {
      push(
        'resubmitted',
        toDate(u.resubmittedAt) ?? toDate(u.submittedAt),
        `${name} resubmitted their details`,
        `Was ${u.resubmittedFrom === 'blacklisted' ? 'blacklisted' : 'rejected'} · waiting for your review`,
      );
    } else if (u.status === 'under_review' || (u.submittedAt && u.status !== 'incomplete')) {
      push(
        'pending',
        toDate(u.submittedAt),
        `${name} is waiting for approval`,
        u.status === 'under_review' ? 'Profile submitted · review it in Pending Approvals' : 'Submitted their profile for review',
      );
    }
    if (u.status === 'approved') {
      push('approved', toDate(u.approvedAt), `${who(u.approvedBy)} approved ${name}`, 'Can now use the app', u.approvedBy);
    }
    if (u.status === 'rejected') {
      push('rejected', toDate(u.rejectedAt), `${who(u.rejectedBy)} rejected ${name}`, u.rejectionReason || 'Application not approved', u.rejectedBy);
    }
    if (u.status === 'blacklisted') {
      push(
        'blacklisted',
        toDate(u.blacklistedAt),
        `${who(u.blacklistedBy)} added ${name} to Blacklist`,
        u.blacklistReason || 'Blocked from the app',
        u.blacklistedBy,
      );
    }
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, NOTIFICATION_LIMIT);
}

/** "5:30pm" today, "Yesterday", otherwise "29 Oct". */
export function notificationTime(d: Date, now = new Date()): string {
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, now)) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();
  }
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
