'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import { arrayUnion, collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdminAuth } from '@/context/AdminAuth';
import { useUsersData } from '@/context/UsersData';
import { buildNotifications, notificationTime, type AdminNotification } from '@/lib/notifications';
import { cn } from './ui';

const KIND_RING: Record<AdminNotification['kind'], string> = {
  signup: 'from-navy to-navy-2',
  pending: 'from-brand to-brand-light',
  resubmitted: 'from-brand to-brand-light',
  approved: 'from-[#16a34a] to-[#4ade80]',
  rejected: 'from-danger to-[#ff7a80]',
  blacklisted: 'from-navy to-[#4b3d8f]',
};

function NotifAvatar({ n, size = 56 }: { n: AdminNotification; size?: number }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full bg-linear-to-br font-semibold text-white', KIND_RING[n.kind])}
      style={{ width: size, height: size, fontSize: size >= 50 ? 20 : 15 }}
    >
      {n.letter}
    </span>
  );
}

type ReadState = { readAt: number; readKeys: Set<string> };

/**
 * Bell in the header (Figma "Notifications" panel 501:2) plus a pop-up toast whenever something
 * new happens while the dashboard is open (a user submits for approval, resubmits, is blocked…).
 * Read state is saved per admin in admins/{uid}: notificationsReadAt + notificationsRead.
 */
export default function Notifications() {
  const router = useRouter();
  const { user } = useAdminAuth();
  const { users, loading } = useUsersData();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<ReadState>({ readAt: 0, readKeys: new Set() });
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<AdminNotification[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const me = user?.email ?? null;

  // Names of the admins, so a decision reads "Daniel added Sara to Blacklist".
  useEffect(() => {
    getDocs(collection(db, 'admins'))
      .then((snap) => {
        const map: Record<string, string> = {};
        snap.forEach((d) => {
          const a = d.data() as { email?: string; name?: string };
          if (a.email) map[a.email.toLowerCase()] = a.name || a.email.split('@')[0];
        });
        setAdminNames(map);
      })
      .catch(() => undefined);
  }, []);

  // This admin's read state.
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, 'admins', user.uid),
      (snap) => {
        const d = snap.data() as { notificationsReadAt?: Timestamp; notificationsRead?: string[] } | undefined;
        setRead({ readAt: d?.notificationsReadAt?.toMillis?.() ?? 0, readKeys: new Set(d?.notificationsRead ?? []) });
      },
      () => undefined,
    );
  }, [user]);

  const items = useMemo(
    () => buildNotifications(users, (email) => adminNames[email.toLowerCase()] ?? email.split('@')[0], me),
    [users, adminNames, me],
  );
  const isUnread = (n: AdminNotification) => n.at.getTime() > read.readAt && !read.readKeys.has(n.key);
  const unread = items.filter(isUnread).length;

  // Pop-up for events that arrive while the page is open (not the admin's own actions).
  useEffect(() => {
    if (loading) return;
    if (!seen.current) {
      seen.current = new Set(items.map((n) => n.key));
      return;
    }
    const fresh = items.filter((n) => !seen.current!.has(n.key));
    fresh.forEach((n) => seen.current!.add(n.key));
    const forMe = fresh.filter((n) => !(me && n.by && n.by.toLowerCase() === me.toLowerCase()));
    if (forMe.length) setToasts((t) => [...forMe.slice(0, 3), ...t].slice(0, 3));
  }, [items, loading, me]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((list) => list.slice(0, -1)), 7000);
    return () => clearTimeout(t);
  }, [toasts]);

  // Close the panel on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAllRead = () => {
    if (!user) return;
    setRead({ readAt: Date.now(), readKeys: new Set() });
    setDoc(doc(db, 'admins', user.uid), { notificationsReadAt: serverTimestamp(), notificationsRead: [] }, { merge: true }).catch(
      () => undefined,
    );
  };

  const openItem = (n: AdminNotification) => {
    setOpen(false);
    setToasts((t) => t.filter((x) => x.key !== n.key));
    if (user && isUnread(n)) {
      setRead((r) => ({ ...r, readKeys: new Set([...r.readKeys, n.key]) }));
      setDoc(doc(db, 'admins', user.uid), { notificationsRead: arrayUnion(n.key) }, { merge: true }).catch(() => undefined);
    }
    router.push(`/users/${n.uid}`);
  };

  return (
    <>
      <div ref={panelRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
          aria-expanded={open}
          className="relative grid size-10 place-items-center rounded-card text-muted hover:bg-page md:size-[54px]"
        >
          <Bell className="size-[22px] md:size-[27px]" strokeWidth={1.6} />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[11px] leading-[18px] font-semibold text-white ring-2 ring-white md:top-2 md:right-2">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="fixed inset-x-3 top-[76px] z-50 rounded-[24px] bg-white shadow-[0_8px_40px_rgba(6,7,2,0.16)] sm:absolute sm:inset-x-auto sm:top-[calc(100%+12px)] sm:right-0 sm:w-[478px] md:rounded-[30px]">
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 md:px-[23px] md:pt-[27px]">
              <h2 className="text-[20px] leading-[31px] font-semibold text-ink md:text-[22.5px]">Notifications</h2>
              <button
                type="button"
                onClick={markAllRead}
                disabled={!unread}
                className="text-[15px] text-brand hover:underline disabled:text-muted disabled:no-underline"
              >
                Mark all as read
              </button>
            </div>
            <ul className="max-h-[min(440px,70vh)] overflow-y-auto px-5 pb-4 md:px-[23px] md:pb-[23px]">
              {items.length === 0 ? (
                <li className="py-10 text-center text-[15px] text-muted">No notifications yet.</li>
              ) : (
                items.map((n, i) => {
                  const fresh = isUnread(n);
                  return (
                    <li key={n.key} className={cn(i > 0 && 'border-t border-line')}>
                      <button
                        type="button"
                        onClick={() => openItem(n)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-[14px] px-1 py-4 text-left transition hover:bg-page md:gap-[14px]',
                          fresh && 'bg-brand/[0.04]',
                        )}
                      >
                        <NotifAvatar n={n} />
                        <span className="min-w-0 flex-1 pt-1">
                          <span className="block text-[16px] leading-6 font-medium text-ink md:text-[18px] md:leading-[26px]">{n.title}</span>
                          <span className="mt-0.5 block truncate text-[14px] leading-5 text-muted">{n.subtitle}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-2 pt-1">
                          <span className="text-[14px] text-muted">{notificationTime(n.at)}</span>
                          {fresh ? <span className="size-2.5 rounded-full bg-brand" aria-label="Unread" /> : null}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Pop-ups for new events */}
      {toasts.length ? (
        <div className="pointer-events-none fixed top-[84px] right-3 z-[60] flex w-[min(400px,calc(100vw-24px))] flex-col gap-3 md:top-[124px] md:right-6">
          {toasts.map((n) => (
            <div
              key={n.key}
              role="status"
              className="pointer-events-auto flex animate-[toast-in_.25s_ease-out] items-start gap-3 rounded-[20px] border border-line bg-white p-4 shadow-[0_8px_40px_rgba(6,7,2,0.16)]"
            >
              <button type="button" onClick={() => openItem(n)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                <NotifAvatar n={n} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-[22px] font-semibold text-ink">{n.title}</span>
                  <span className="block truncate text-[13.5px] text-muted">{n.subtitle}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setToasts((t) => t.filter((x) => x.key !== n.key))}
                aria-label="Dismiss"
                className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-page"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
