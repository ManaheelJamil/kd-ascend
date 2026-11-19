'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PaymentForm } from '@/components/PaymentForm';
import { FullPageSpinner, PageShell, ui } from '@/components/ui';
import { getPayment, type PaymentTransaction } from '@/lib/payments';

export default function EditPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [payment, setPayment] = useState<PaymentTransaction | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setPayment(null);
      return;
    }
    const t = window.setTimeout(() => setPayment(getPayment(id)), 0);
    return () => window.clearTimeout(t);
  }, [id]);

  if (payment === undefined) return <FullPageSpinner />;
  if (!payment) {
    return (
      <PageShell>
        <h1 className={ui.pageHeading}>Payment not found</h1>
        <Link href="/payment" className="mt-4 text-brand underline">
          Back to payments
        </Link>
      </PageShell>
    );
  }

  return <PaymentForm payment={payment} />;
}
