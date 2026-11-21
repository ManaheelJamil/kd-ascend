/**
 * In-app notifications (Figma "Notifications" 196:2673), built live from what the app already
 * receives: my bookings (applications + jobs), my payments and my profile status.
 * Nothing extra is written to Firestore. "Seen" and the Notification Settings switches are kept
 * on this phone (AsyncStorage), per signed-in user.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  bookingState,
  eventStartMs,
  isLateCancel,
  shortDate,
  timeLabel,
  type Booking,
  type PaymentTransaction,
} from './jobsService';
import { money } from './earningsService';
import type { UserDoc } from './userService';

export type NotifKind = 'pending' | 'success' | 'error' | 'reminder';
/** The four switches on Notification Settings (Figma 196:4900). */
export type NotifCategory = 'booking' | 'reminder' | 'payment' | 'system';

export type AppNotification = {
  id: string;
  kind: NotifKind;
  category: NotifCategory;
  title: string;
  body: string;
  /** When it happened (ms). */
  at: number;
  /** Booking it is about, to open on tap. */
  jobId?: string;
  target?: 'booking' | 'earnings' | 'account';
};

export type NotifSettings = Record<NotifCategory, boolean>;
export const DEFAULT_NOTIF_SETTINGS: NotifSettings = { booking: true, reminder: true, payment: true, system: true };

export const SETTING_ROWS: { key: NotifCategory; title: string; text: string }[] = [
  { key: 'booking', title: 'Booking Updates', text: 'Receive updates about your job status' },
  { key: 'reminder', title: 'Job Reminders', text: 'Get reminded before your shift starts' },
  { key: 'payment', title: 'Payment Notifications', text: 'Get notified when payment is processed' },
  { key: 'system', title: 'System Alerts', text: 'Important security and account updates' },
];

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

const tsMs = (v: unknown): number | undefined =>
  v && typeof (v as { toMillis?: () => number }).toMillis === 'function'
    ? (v as { toMillis: () => number }).toMillis()
    : undefined;

function shiftText(b: Booking) {
  return `${b.job.corporateName}, ${shortDate(b.job.eventDate)}, ${timeLabel(b.job.eventTime)}`;
}

function startTime(b: Booking): string {
  const m = (b.job.eventTime || '').match(/^\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
  return m ? m[1].replace(/\s+/, '').toUpperCase() : 'the scheduled time';
}

/** All notifications, newest first. */
export function buildNotifications(
  bookings: Booking[],
  payments: PaymentTransaction[],
  profile: UserDoc | null | undefined,
  now = Date.now(),
): AppNotification[] {
  const list: AppNotification[] = [];

  for (const b of bookings) {
    const base = b.app.addedAtMs ?? b.app.statusUpdatedAtMs ?? 0;
    const changed = b.app.statusUpdatedAtMs ?? base;
    const state = bookingState(b, now);

    if (base) {
      list.push({
        id: `submitted_${b.app.id}_${b.job.id}`,
        kind: 'pending',
        category: 'booking',
        title: 'Booking submitted',
        body: `Your booking for ${shiftText(b)}, is submitted successfully`,
        at: base,
        jobId: b.job.id,
        target: 'booking',
      });
    }
    if (b.app.status === 'approved') {
      list.push({
        id: `confirmed_${b.app.id}_${b.job.id}`,
        kind: 'success',
        category: 'booking',
        title: 'Booking confirmed',
        body: `Your booking for ${shiftText(b)}, is confirmed. Get ready for your shift!`,
        at: Math.max(changed, base + 1),
        jobId: b.job.id,
        target: 'booking',
      });
    }
    if (b.app.status === 'rejected') {
      list.push({
        id: `rejected_${b.app.id}_${b.job.id}`,
        kind: 'error',
        category: 'booking',
        title: 'Booking unsuccessfully',
        body: `Your booking for ${shiftText(b)}, is unsuccessful. Please make another booking!`,
        at: Math.max(changed, base + 1),
        jobId: b.job.id,
        target: 'booking',
      });
    }
    if (b.app.status === 'cancelled') {
      const late = b.app.cancelledAt ? isLateCancel(b.job, Date.parse(b.app.cancelledAt)) : false;
      list.push({
        id: `cancelled_${b.app.id}_${b.job.id}`,
        kind: 'error',
        category: 'booking',
        title: 'Booking cancelled',
        body: `Your booking for ${shiftText(b)}, is cancelled.${late ? ' A $50 late-cancellation penalty applies.' : ''}`,
        at: Math.max(changed || (b.app.cancelledAt ? Date.parse(b.app.cancelledAt) : 0), base + 1),
        jobId: b.job.id,
        target: 'booking',
      });
    }
    if (state === 'job_cancelled') {
      list.push({
        id: `jobcancelled_${b.job.id}`,
        kind: 'error',
        category: 'booking',
        title: 'Job cancelled',
        body: `The organiser cancelled ${shiftText(b)}. Please make another booking!`,
        at: Math.max(b.job.updatedAtMs ?? changed, base + 2),
        jobId: b.job.id,
        target: 'booking',
      });
    }
    // Shift reminder: confirmed shift starting within the next 24 hours.
    const start = eventStartMs(b.job);
    if (state === 'confirmed' && start != null && start > now && start - now <= REMINDER_WINDOW_MS) {
      const today = new Date(start).toDateString() === new Date(now).toDateString();
      list.push({
        id: `reminder_${b.app.id}_${b.job.id}`,
        kind: 'reminder',
        category: 'reminder',
        title: 'Upcoming shift reminder',
        body: `Your shift for ${b.job.corporateName}, ${b.job.title}, starts ${today ? 'today' : 'tomorrow'} at ${startTime(b)}. Don't be late!`,
        at: Math.max(start - REMINDER_WINDOW_MS, changed),
        jobId: b.job.id,
        target: 'booking',
      });
    }
  }

  const jobs = new Map(bookings.map((b) => [b.job.id, b.job]));
  for (const t of payments) {
    const job = jobs.get(t.jobId);
    const where = job ? `${job.corporateName}, ${shortDate(job.eventDate)}` : t.jobIdLabel;
    if (t.type === 'payout' && t.status === 'completed') {
      list.push({
        id: `paid_${t.id}`,
        kind: 'success',
        category: 'payment',
        title: 'Payment received',
        body: `${money(t.amount)} for ${where} has been paid${t.method ? ` via ${t.method}` : ''}.`,
        at: t.completedAtMs ?? t.createdAt?.toMillis?.() ?? 0,
        target: 'earnings',
      });
    } else if (t.type === 'payout' && t.status === 'pending') {
      list.push({
        id: `processing_${t.id}`,
        kind: 'pending',
        category: 'payment',
        title: 'Payment processing',
        body: `Your payment of ${money(t.amount)} for ${where} is being processed.`,
        at: t.createdAt?.toMillis?.() ?? 0,
        target: 'earnings',
      });
    } else if (t.type === 'penalty' && t.status !== 'draft') {
      list.push({
        id: `penalty_${t.id}`,
        kind: 'error',
        category: 'payment',
        title: 'Penalty deducted',
        body: `A late-cancellation penalty of ${money(t.amount)} for ${where} has been deducted.`,
        at: t.completedAtMs ?? t.createdAt?.toMillis?.() ?? 0,
        target: 'earnings',
      });
    }
  }

  if (profile) {
    const approved = tsMs(profile.approvedAt);
    if (approved) {
      list.push({
        id: `verified_${approved}`,
        kind: 'success',
        category: 'system',
        title: 'Profile verified',
        body: 'Your profile is verified! You can now book your desired jobs!',
        at: approved,
        target: 'account',
      });
    }
    const submitted = tsMs((profile as { submittedAt?: unknown }).submittedAt);
    if (profile.status === 'under_review' && submitted) {
      list.push({
        id: `review_${submitted}`,
        kind: 'pending',
        category: 'system',
        title: 'Profile under review',
        body: 'Your profile is currently under review, kindly wait 1-3 business days.',
        at: submitted,
        target: 'account',
      });
    }
  }

  return list.filter((n) => n.at > 0 && n.at <= now + 60 * 1000).sort((a, b) => b.at - a.at);
}

/** "Just Now", "5 min ago", "1hr ago", "Yesterday", "2 days ago", "02 Feb 2026". */
export function timeAgo(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 60) return 'Just Now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}hr ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const d = new Date(at);
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${M[d.getMonth()]} ${d.getFullYear()}`;
}

/* ------------------------------------------------------------------ settings + seen (on device) */

const settingsKey = (uid: string) => `kd.notifSettings.${uid}`;
const seenKey = (uid: string) => `kd.notifSeenAt.${uid}`;

type Listener = () => void;
const listeners = new Set<Listener>();
const cache: { settings: Map<string, NotifSettings>; seen: Map<string, number> } = { settings: new Map(), seen: new Map() };

export function onNotifPrefsChange(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
const emit = () => listeners.forEach((l) => l());

export async function loadNotifSettings(uid: string): Promise<NotifSettings> {
  const hit = cache.settings.get(uid);
  if (hit) return hit;
  try {
    const raw = await AsyncStorage.getItem(settingsKey(uid));
    const parsed = raw ? (JSON.parse(raw) as Partial<NotifSettings>) : {};
    const value = { ...DEFAULT_NOTIF_SETTINGS, ...parsed };
    cache.settings.set(uid, value);
    return value;
  } catch {
    return DEFAULT_NOTIF_SETTINGS;
  }
}

export async function saveNotifSettings(uid: string, value: NotifSettings): Promise<void> {
  await AsyncStorage.setItem(settingsKey(uid), JSON.stringify(value));
  cache.settings.set(uid, value);
  emit();
}

export async function loadSeenAt(uid: string): Promise<number> {
  const hit = cache.seen.get(uid);
  if (hit != null) return hit;
  try {
    const raw = await AsyncStorage.getItem(seenKey(uid));
    const value = raw ? Number(raw) || 0 : 0;
    cache.seen.set(uid, value);
    return value;
  } catch {
    return 0;
  }
}

export async function markSeen(uid: string, at = Date.now()): Promise<void> {
  cache.seen.set(uid, at);
  emit();
  try {
    await AsyncStorage.setItem(seenKey(uid), String(at));
  } catch {
    // Not critical: the dot just shows again next launch.
  }
}
