'use client';

import { Check } from 'lucide-react';
import { Button, Modal, ModalClose, cn, ui } from '@/components/ui';

export type SuccessDetail = { label: string; value: string; mono?: boolean };

type Action = {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
};

/**
 * Confirmation after create/edit on long forms — one pattern for Users and Corporates.
 */
export function FormSuccessModal({
  open,
  onClose,
  title,
  description,
  details,
  footnote,
  primaryAction,
  secondaryAction,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  details?: SuccessDetail[];
  footnote?: string;
  primaryAction: Action;
  secondaryAction?: Action;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-[480px]">
      <ModalClose onClose={onClose} />
      <div className="p-7 sm:p-8">
        <div className="flex items-start gap-3 pr-6 sm:gap-[13px] sm:pr-8">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#dcfce7] text-success sm:size-[54px]" aria-hidden>
            <Check className="size-6 sm:size-7" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id="form-success-title" className={ui.sectionTitle}>
              {title}
            </h2>
            <p className={cn('mt-1', ui.sectionLead)}>{description}</p>
          </div>
        </div>

        {details?.length ? (
          <dl className="mt-6 divide-y divide-line/80 rounded-control border border-line bg-page/50">
            {details.map((d) => (
              <div key={d.label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4 sm:px-5">
                <dt className="shrink-0 text-[13px] font-medium text-muted sm:w-[7.25rem]">{d.label}</dt>
                <dd
                  className={cn(
                    'min-w-0 whitespace-normal wrap-anywhere text-[15px] font-medium text-ink',
                    d.mono && 'font-mono text-[14.5px]',
                  )}
                >
                  {d.value || '—'}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {footnote ? (
          <p className="mt-4 rounded-control border border-brand/15 bg-brand/5 px-3.5 py-2.5 text-[13px] leading-snug text-ink">
            {footnote}
          </p>
        ) : null}

        <div className={cn('mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end')}>
          {secondaryAction ? (
            <Button variant="outline" size="lg" className="sm:min-w-[140px]" onClick={secondaryAction.onClick}>
              {secondaryAction.icon}
              {secondaryAction.label}
            </Button>
          ) : null}
          <Button size="lg" className={cn(secondaryAction ? 'sm:min-w-[160px]' : 'w-full')} onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        </div>
      </div>
    </Modal>
  );
}