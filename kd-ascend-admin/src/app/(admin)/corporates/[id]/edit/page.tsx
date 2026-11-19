'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CorporateForm } from '@/components/CorporateForm';
import { ErrorNote, FullPageSpinner, PageShell, ui } from '@/components/ui';
import { subscribeCorporate, type Corporate } from '@/lib/corporates';

export default function EditCorporatePage() {
  const { id } = useParams<{ id: string }>();
  const [corporate, setCorporate] = useState<Corporate | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setCorporate(null);
      return;
    }
    return subscribeCorporate(
      id,
      (c) => setCorporate(c),
      (e) => setError(e.message),
    );
  }, [id]);

  if (error && corporate === undefined) return <ErrorNote>{error}</ErrorNote>;
  if (corporate === undefined) return <FullPageSpinner />;
  if (!corporate) {
    return (
      <PageShell>
        <h1 className={ui.pageHeading}>Corporate not found</h1>
        <Link href="/corporates" className="mt-4 text-brand underline">
          Back to corporates
        </Link>
      </PageShell>
    );
  }

  return <CorporateForm mode="edit" corporate={corporate} />;
}