'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeUsers } from '@/lib/users';
import { sortByNewest } from '@/lib/format';
import type { AccountStatus, UserDoc } from '@/lib/types';

type Counts = Record<AccountStatus, number> & { total: number };

type State = {
  users: UserDoc[];
  loading: boolean;
  error: string | null;
  counts: Counts;
};

const Ctx = createContext<State | null>(null);

/** One live Firestore subscription to `users`, shared by every admin page. */
export function UsersDataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeUsers(
        (list) => {
          setUsers(sortByNewest(list));
          setError(null);
          setLoading(false);
        },
        (e) => {
          setError(
            (e as { code?: string }).code === 'permission-denied'
              ? 'Permission denied while reading users. Publish the latest Firestore rules (see README).'
              : e.message,
          );
          setLoading(false);
        },
      ),
    [],
  );

  const counts = useMemo(() => {
    const c: Counts = { total: users.length, incomplete: 0, under_review: 0, approved: 0, rejected: 0, blacklisted: 0 };
    users.forEach((u) => {
      if (u.status in c) c[u.status] += 1;
    });
    return c;
  }, [users]);

  const value = useMemo(() => ({ users, loading, error, counts }), [users, loading, error, counts]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUsersData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUsersData must be used inside <UsersDataProvider>');
  return ctx;
}
