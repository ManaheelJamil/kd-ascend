'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { UserForm } from '@/components/UserForm';
import { FullPageSpinner, PageShell, ui } from '@/components/ui';
import { subscribeUser } from '@/lib/users';
import type { UserDoc } from '@/lib/types';

export default function EditUserPage() {
  const { uid } = useParams<{ uid: string }>();
  const [user, setUser] = useState<UserDoc | null | undefined>(undefined);

  useEffect(() => {
    if (!uid) {
      setUser(null);
      return;
    }
    return subscribeUser(
      uid,
      (u) => setUser(u),
      () => setUser(null),
    );
  }, [uid]);

  if (user === undefined) return <FullPageSpinner />;
  if (!user) {
    return (
      <PageShell>
        <h1 className={ui.pageHeading}>User not found</h1>
        <Link href="/users" className="mt-4 text-brand underline">
          Back to users
        </Link>
      </PageShell>
    );
  }

  return <UserForm mode="edit" user={user} />;
}