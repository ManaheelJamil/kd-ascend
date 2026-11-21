import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMyBookings } from './useJobs';
import { subscribeMyPayments, type PaymentTransaction } from '../services/jobsService';
import {
  DEFAULT_NOTIF_SETTINGS,
  buildNotifications,
  loadNotifSettings,
  loadSeenAt,
  markSeen,
  onNotifPrefsChange,
  type NotifSettings,
} from '../services/notificationsService';

/** Live notifications for the signed-in member, filtered by their Notification Settings. */
export function useNotifications() {
  const { user, profile } = useAuth();
  const uid = user?.uid;
  const { bookings, loading } = useMyBookings(uid);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_NOTIF_SETTINGS);
  const [seenAt, setSeenAt] = useState(0);
  // Re-evaluated every minute so "Just Now" / reminders stay current.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!uid) return;
    return subscribeMyPayments(uid, setPayments, () => undefined);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const refresh = () => {
      void loadNotifSettings(uid).then((s) => alive && setSettings(s));
      void loadSeenAt(uid).then((s) => alive && setSeenAt(s));
    };
    refresh();
    const off = onNotifPrefsChange(refresh);
    return () => {
      alive = false;
      off();
    };
  }, [uid]);

  const all = useMemo(() => buildNotifications(bookings, payments, profile, now), [bookings, payments, profile, now]);
  const items = useMemo(() => all.filter((n) => settings[n.category]), [all, settings]);
  const unread = items.filter((n) => n.at > seenAt).length;

  const markAllSeen = useCallback(() => {
    if (uid) void markSeen(uid);
  }, [uid]);

  return { items, unread, seenAt, loading, markAllSeen };
}
