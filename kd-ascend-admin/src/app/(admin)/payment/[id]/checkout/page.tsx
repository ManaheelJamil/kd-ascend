'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import {
  PaymentCompleteConfirmDialog,
  PaymentStatusBadge,
  PaymentSummaryActions,
  PaymentSummaryActionsRow,
  paymentActionClasses,
} from '@/components/PaymentBits';
import { PaymentJobSummary } from '@/components/PaymentJobSummary';
import { useToast } from '@/components/Toast';
import { Avatar, Button, Card, DetailPageHeader, ErrorNote, FullPageSpinner, PageShell, cn, ui } from '@/components/ui';
import {
  completePayment,
  downloadPaymentReceipt,
  formatMoney,
  getPayment,
  normalizePaymentAdjustments,
  paymentCalcLine,
  paymentTotals,
  type PaymentTransaction,
} from '@/lib/payments';
import { getJob } from '@/lib/jobs';

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '?';
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-[15.8px] text-muted">{label}</span>
      <span className={cn('text-[15.8px] font-semibold text-ink', valueClass)}>{value}</span>
    </div>
  );
}

export default function PaymentCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [payment, setPayment] = useState<PaymentTransaction | null | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setPayment(null);
      return;
    }
    const t = window.setTimeout(() => setPayment(getPayment(id)), 0);
    return () => window.clearTimeout(t);
  }, [id]);

  const complete = async () => {
    if (!payment) return;
    setError(null);
    try {
      await completePayment(payment.id);
      toast.success(`Payment ${payment.txnId} completed successfully.`);
      router.push('/payment');
    } catch (e) {
      setError((e as Error).message || 'Could not complete payment.');
      throw e;
    }
  };

  const receipt = () => {
    if (!payment) return;
    downloadPaymentReceipt(payment);
    toast.success('Receipt downloaded.');
  };

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

  const adj = normalizePaymentAdjustments(payment.bonus, payment.deduction);
  const totals = paymentTotals(payment.adjustedHours, payment.hourlyRate, adj.bonus, adj.deduction);
  const cappedAtZero = totals.rawFinal < 0;
  const canPay = payment.status === 'pending';
  const completed = payment.status === 'completed';
  const job = payment.jobId ? getJob(payment.jobId) : null;

  return (
    <PageShell variant="detail">
      <DetailPageHeader
        title="Checkout"
        subtitle="Review the verified amount, then complete the payment"
        back={
          <button
            type="button"
            onClick={() => router.push(`/payment/${payment.id}/edit`)}
            aria-label="Back"
            className="mt-1 grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink transition hover:bg-line sm:size-[54px]"
          >
            <ArrowLeft className="size-[22px]" />
          </button>
        }
      />

      <Card pad="lg" className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-[17px]">
          <Avatar letter={nameInitials(payment.userName)} size={54} />
          <div className="min-w-0">
            <p className="truncate text-[15.8px] font-semibold text-ink">{payment.userName}</p>
            <p className="truncate text-[13.5px] text-muted">
              {payment.userEmail || '—'} • Job ID: {payment.jobIdLabel} • {payment.txnId}
            </p>
          </div>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card pad="lg">
          <h2 className={ui.sectionTitle}>Job for this payout</h2>
          <p className={cn('mt-1', ui.sectionLead)}>The event this payment is for.</p>
          <div className="mt-[27px]">
            <PaymentJobSummary job={job} jobIdFallback={payment.jobIdLabel} />
          </div>

          <h2 className={cn(ui.sectionTitle, 'mt-9')}>Payment details</h2>
          <p className={cn('mt-1', ui.sectionLead)}>This is the amount that will be sent after you make the payment.</p>
          <div className="mt-[27px] divide-y divide-line">
            <Row label="Transaction ID" value={payment.txnId} />
            <Row label="Method" value={payment.method} />
            <Row label="Assumed hours" value={`${payment.assumedHours} hrs`} />
            <Row label="Adjusted hours" value={`${payment.adjustedHours} hrs`} />
            <Row label="Hourly rate" value={`${formatMoney(payment.hourlyRate)} / hr`} />
            <Row label="Base amount" value={formatMoney(totals.base)} />
            <Row label="Bonus" value={`+${formatMoney(totals.bonus)}`} valueClass="text-success" />
            <Row
              label="Deduction"
              value={totals.deduction > 0 ? `−${formatMoney(totals.deduction)}` : formatMoney(0)}
              valueClass={totals.deduction > 0 ? 'text-danger' : undefined}
            />
            {payment.note.trim() ? <Row label="Note" value={payment.note} /> : null}
          </div>
        </Card>

        <Card pad="lg" className="xl:sticky xl:top-[135px]">
          <h2 className={ui.sectionTitle}>Payment Summary</h2>
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center justify-between text-[15.8px]">
              <span className="text-muted">Base Amount</span>
              <span className="font-semibold text-ink">{formatMoney(totals.base)}</span>
            </div>
            <div className="flex items-center justify-between text-[15.8px]">
              <span className="text-muted">Bonus</span>
              <span className="font-semibold text-success">+{formatMoney(totals.bonus)}</span>
            </div>
            <div className="flex items-center justify-between text-[15.8px]">
              <span className="text-muted">Deduction</span>
              <span className="font-semibold text-danger">
                {totals.deduction > 0 ? `−${formatMoney(totals.deduction)}` : formatMoney(0)}
              </span>
            </div>
            <div className="border-t border-line pt-4">
              <div className="flex items-end justify-between gap-3">
                <span className="text-[15.8px] font-semibold text-ink">Final Amount</span>
                <span className={ui.pageHeading}>{formatMoney(totals.final)}</span>
              </div>
              {cappedAtZero ? (
                <p className="mt-2 text-[13px] text-muted">Capped at $0.00 after deduction.</p>
              ) : null}
            </div>
          </div>
          <div className="mt-4 rounded-card bg-brand/10 px-4 py-3.5">
            <p className="text-[13.5px] font-medium text-muted">Calculation</p>
            <p className="mt-1 text-[14.5px] font-semibold text-ink">
              {paymentCalcLine(payment.adjustedHours, payment.hourlyRate, adj.bonus, adj.deduction)}
            </p>
          </div>
          {completed ? (
            <p className="mt-4 text-[13.5px] text-muted">This payment is complete. Download the receipt below.</p>
          ) : canPay ? (
            <p className="mt-4 text-[13.5px] text-muted">
              Status is{' '}
              <span className="inline-block whitespace-nowrap font-semibold text-brand">Pending</span>
              . Confirm to mark as paid.
            </p>
          ) : (
            <p className="mt-4 text-[13.5px] text-muted">Verify this payment from the edit screen before checkout.</p>
          )}
          {error ? (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          ) : null}
          <PaymentSummaryActions>
            <Button variant="outline" className={paymentActionClasses.fullIcon} onClick={receipt}>
              <Download className="size-[18px]" />
              Download receipt
            </Button>
            {completed ? (
              <Button variant="outline" className={paymentActionClasses.full} onClick={() => router.push('/payment')}>
                Back to payments
              </Button>
            ) : canPay ? (
              <PaymentSummaryActionsRow>
                <Button
                  variant="outline"
                  className={paymentActionClasses.full}
                  onClick={() => router.push(`/payment/${payment.id}/edit`)}
                >
                  Edit
                </Button>
                <Button className={paymentActionClasses.full} onClick={() => setConfirmOpen(true)}>
                  Make Payment
                </Button>
              </PaymentSummaryActionsRow>
            ) : (
              <PaymentSummaryActionsRow>
                <Button
                  variant="outline"
                  className={paymentActionClasses.full}
                  onClick={() => router.push(`/payment/${payment.id}/edit`)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className={paymentActionClasses.full}
                  onClick={() => router.push('/payment')}
                >
                  Back to payments
                </Button>
              </PaymentSummaryActionsRow>
            )}
          </PaymentSummaryActions>
        </Card>
      </div>

      <PaymentCompleteConfirmDialog
        payment={payment}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={complete}
      />
    </PageShell>
  );
}