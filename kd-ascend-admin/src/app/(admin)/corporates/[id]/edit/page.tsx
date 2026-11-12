'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ErrorNote, FullPageSpinner } from '@/components/ui';
import CorporateForm from '@/components/CorporateForm';
import { subscribeCorporate, type Corporate } from '@/lib/corporates';

/** Edit Corporate: the same page as Add Corporate (Figma 77:6562), filled in with the saved values. */
export default function EditCorporatePage() {
  const { id } = useParams<{ id: string }>();
  const [corporate, setCorporate] = useState<Corporate | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Read once: the form keeps the admin's typing even if the record changes meanwhile.
  useEffect(() => {
    let first = true;
    const unsub = subscribeCorporate(
      id,
      (c) => {
        if (!first) return;
        first = false;
        setCorporate(c);
      },
      (e) => setError(e.message),
    );
    return unsub;
  }, [id]);

  if (error && corporate === undefined) return <ErrorNote>{error}</ErrorNote>;
  if (corporate === undefined) return <FullPageSpinner />;
  if (corporate === null)
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">Corporate not found</p>
        <Link href="/corporates" className="mt-3 inline-block text-brand underline">
          Back to corporates
        </Link>
      </div>
    );

  return <CorporateForm corporate={corporate} />;
}
