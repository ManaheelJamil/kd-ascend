'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  PaymentStatusBadge,
  PaymentSummaryActions,
  PaymentSummaryActionsRow,
  paymentActionClasses,
} from '@/components/PaymentBits';
import { PaymentJobSummary, PaymentJobSummaryEmpty } from '@/components/PaymentJobSummary';
import { useToast } from '@/components/Toast';
import {
  Avatar,
  Button,
  Card,
  DetailPageHeader,
  ErrorNote,
  Field,
  PageShell,
  Select,
  TextArea,
  TextInput,
  cn,
  ui,
} from '@/components/ui';
import { getJob } from '@/lib/jobs';
import {
  formatMoney,
  normalizePaymentAdjustments,
  paymentCalcLine,
  paymentTotals,
  savePayment,
  validatePaymentInput,
  type PaymentInput,
  type PaymentTransaction,
} from '@/lib/payments';

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  return letters || name.charAt(0).toUpperCase() || '?';
}

function SuffixedInput({
  suffix,
  disabled,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { suffix: string; invalid?: boolean }) {
  const invalid = (rest as { invalid?: boolean }).invalid;
  return (
    <div className="relative">
      <TextInput
        {...rest}
        disabled={disabled}
        className={cn('pr-16', disabled && 'bg-page text-muted')}
        invalid={invalid}
      />
      <span className="pointer-events-none absolute top-1/2 right-[18px] -translate-y-1/2 text-[13.5px] text-muted">{suffix}</span>
    </div>
  );
}

function fromTxn(t: PaymentTransaction): PaymentInput {
  const adj = normalizePaymentAdjustments(t.bonus, t.deduction);
  return {
    userUid: t.userUid,
    userName: t.userName,
    userEmail: t.userEmail,
    jobId: t.jobId,
    jobIdLabel: t.jobIdLabel,
    type: t.type,
    method: t.method,
    assumedHours: t.assumedHours,
    hourlyRate: t.hourlyRate,
    adjustedHours: t.adjustedHours,
    bonus: adj.bonus,
    deduction: adj.deduction,
    note: t.note,
  };
}

export function PaymentForm({ payment }: { payment: PaymentTransaction }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<PaymentInput>(() => fromTxn(payment));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = payment.status === 'completed' || payment.status === 'failed';

  const selectedJob = useMemo(() => (form.jobId ? getJob(form.jobId) : null), [form.jobId]);

  const patch = (next: Partial<PaymentInput>) => setForm((f) => ({ ...f, ...next }));
  const totals = paymentTotals(form.adjustedHours, form.hourlyRate, form.bonus, form.deduction);
  const hours = Number.isFinite(form.adjustedHours) ? form.adjustedHours : 0;
  const cappedAtZero = totals.rawFinal < 0;

  const parseAmount = (raw: string) => Math.max(0, Number.parseFloat(raw) || 0);

  const persist = async (intent: 'draft' | 'verify') => {
    const msg = validatePaymentInput(form, intent === 'verify');
    if (msg) {
      setError(msg);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = await savePayment(payment.id, form, intent === 'draft' ? 'draft' : 'pending');
      if (intent === 'draft') {
        toast.success('Payment saved as draft.');
        router.push('/payment');
        return;
      }
      toast.success('Payment verified. Review checkout to complete.');
      router.push(`/payment/${id}/checkout`);
    } catch (e) {
      setError((e as Error).message || 'Could not save payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell variant="detail">
      <DetailPageHeader
        title="Edit Payment"
        subtitle="Verify hours, adjust the amount, and prepare the payment"
        back={
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push('/payment'))}
            aria-label="Back"
            className="mt-1 grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink transition hover:bg-line sm:size-[54px]"
          >
            <ArrowLeft className="size-[22px]" />
          </button>
        }
      />

      <Card pad="lg" className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-[17px]">
          <Avatar letter={nameInitials(form.userName) || '?'} size={54} />
          <div className="min-w-0">
            <p className="truncate text-[15.8px] font-semibold text-ink">{form.userName || '—'}</p>
            <p className="truncate text-[13.5px] text-muted">
              {form.userEmail || '—'}
              {form.jobIdLabel ? ` • Job ID: ${form.jobIdLabel}` : ''}
            </p>
          </div>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card pad="lg">
          <h2 className={ui.sectionTitle}>Payment Calculation</h2>
          <p className={cn('mt-1', ui.sectionLead)}>Initial payment is based on the assumed hours and hourly rate.</p>

          {selectedJob ? (
            <div className="mt-[27px]">
              <PaymentJobSummary job={selectedJob} />
            </div>
          ) : (
            <PaymentJobSummaryEmpty className="mt-[27px]" />
          )}

          {!locked ? (
            <div className="mt-[27px] max-w-md">
              <Field label="Payout method">
                <Select
                  options={['Bank Transfer', 'PayNow'] as const}
                  value={form.method}
                  placeholder="Select method"
                  onChange={(e) => patch({ method: e.target.value })}
                />
              </Field>
            </div>
          ) : null}

          <div className={cn('grid gap-[27px] md:grid-cols-2', 'mt-[27px]')}>
            <Field label="Assumed Hours">
              <SuffixedInput suffix="hours" value={String(form.assumedHours)} disabled readOnly />
            </Field>
            <Field label="Hourly Rate">
              <SuffixedInput suffix="/ hr" value={formatMoney(form.hourlyRate).replace('$', '$')} disabled readOnly />
            </Field>
            <Field label="Adjusted Hours">
              <SuffixedInput
                suffix="hours"
                inputMode="decimal"
                disabled={locked}
                value={Number.isFinite(form.adjustedHours) ? String(form.adjustedHours) : ''}
                onChange={(e) => patch({ adjustedHours: Number(e.target.value) })}
              />
            </Field>
            <Field label="Bonus">
              <SuffixedInput
                suffix="USD"
                inputMode="decimal"
                disabled={locked}
                value={Number.isFinite(form.bonus) ? String(form.bonus) : ''}
                onChange={(e) => patch({ bonus: parseAmount(e.target.value) })}
              />
            </Field>
            <Field
              label="Deduction"
              error={form.deduction > 0 && !form.note.trim() && error === 'Add a note explaining the deduction.' ? error : null}
            >
              <SuffixedInput
                suffix="USD"
                inputMode="decimal"
                disabled={locked}
                value={Number.isFinite(form.deduction) ? String(form.deduction) : ''}
                onChange={(e) => patch({ deduction: parseAmount(e.target.value) })}
              />
              {form.deduction > 0 ? (
                <p className="mt-2 text-[13px] text-muted">Explain in the note why pay was reduced.</p>
              ) : null}
            </Field>
            <div className="md:col-span-2">
              <Field label="Admin adjustment / note">
                <TextArea
                  disabled={locked}
                  placeholder="Optional: bonus, reduced hours, or reason for deduction…"
                  value={form.note}
                  onChange={(e) => patch({ note: e.target.value })}
                  invalid={form.deduction > 0 && !form.note.trim() && !!error}
                />
              </Field>
            </div>
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
                <p className="mt-2 text-[13px] text-muted">Deduction exceeds earnings; payout will be $0.00.</p>
              ) : null}
            </div>
            <div className="rounded-card bg-brand/10 px-4 py-3.5">
              <p className="text-[13.5px] font-medium text-muted">Calculation</p>
              <p className="mt-1 text-[14.5px] font-semibold text-ink">
                {paymentCalcLine(hours, form.hourlyRate, form.bonus, form.deduction)}
              </p>
            </div>
            <p className={cn(ui.sectionLead, 'text-pretty')}>
              After verification, status becomes{' '}
              <span className="inline-block whitespace-nowrap font-semibold text-brand">Pending</span> (ready for checkout).
            </p>
          </div>

          {error ? (
            <div className="mt-5">
              <ErrorNote>{error}</ErrorNote>
            </div>
          ) : null}

          {locked ? (
            <PaymentSummaryActions>
              <Button variant="outline" className={paymentActionClasses.full} onClick={() => router.push('/payment')}>
                Back to payments
              </Button>
            </PaymentSummaryActions>
          ) : (
            <PaymentSummaryActions>
              <PaymentSummaryActionsRow cols={3}>
                <Button
                  variant="outline"
                  className={paymentActionClasses.full}
                  disabled={saving}
                  onClick={() => router.push('/payment')}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className={paymentActionClasses.full}
                  loading={saving}
                  disabled={locked}
                  onClick={() => persist('draft')}
                >
                  Draft
                </Button>
                <Button
                  className={paymentActionClasses.full}
                  loading={saving}
                  disabled={locked}
                  onClick={() => persist('verify')}
                >
                  Verify
                </Button>
              </PaymentSummaryActionsRow>
            </PaymentSummaryActions>
          )}
        </Card>
      </div>
    </PageShell>
  );
}