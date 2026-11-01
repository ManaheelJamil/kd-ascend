'use client';

import React, { useEffect } from 'react';
import { Calendar, ChevronDown, Loader2, X } from 'lucide-react';
import { extendTailwindMerge } from 'tailwind-merge';
import type { AccountStatus } from '@/lib/types';
import { STATUS_LABEL } from '@/lib/format';

// Teaches tailwind-merge the custom tokens from globals.css so later classes override earlier ones.
const twMerge = extendTailwindMerge({
  extend: { theme: { radius: ['card', 'control'], shadow: ['brand'] } },
});

/** Joins class names; when two classes set the same thing (e.g. h-10 and h-[51px]) the later one wins. */
export function cn(...classes: (string | false | null | undefined)[]) {
  return twMerge(classes.filter(Boolean).join(' '));
}

/* ---------- Layout ---------- */

export function Card({ className, accent, children }: { className?: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-card border bg-white', accent ? 'border-brand' : 'border-line', className)}>{children}</div>
  );
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] leading-7 font-bold text-ink sm:text-[27px] sm:leading-8">{title}</h1>
        {subtitle ? <p className="mt-1 text-[14px] text-muted sm:text-[15.8px]">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

/* ---------- Buttons ---------- */

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'success' | 'navy' | 'soft';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-brand hover:brightness-105',
  outline: 'border border-field bg-white text-muted hover:bg-page',
  ghost: 'text-muted hover:bg-page',
  danger: 'bg-danger text-white hover:brightness-105',
  success: 'bg-success text-white hover:brightness-110',
  navy: 'bg-navy text-white hover:brightness-125',
  soft: 'bg-brand/10 text-brand hover:bg-brand/15',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  const sizes = {
    sm: 'h-[31px] rounded-control px-3.5 text-[13.5px] font-medium',
    md: 'h-10 rounded-control px-4 text-[15.8px] font-medium',
    lg: 'h-12 rounded-card px-5 text-base font-semibold sm:h-14 sm:px-7 sm:text-lg',
  };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-60',
        sizes[size],
        VARIANTS[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="size-[18px] animate-spin" /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn('grid size-[31px] place-items-center rounded-control transition hover:bg-page', className)}
    >
      {children}
    </button>
  );
}

/* ---------- Form controls ---------- */

export function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('flex flex-col gap-3', className)}>
      <span className="text-[13.5px] font-medium text-muted">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
      {error ? <span className="-mt-1.5 text-[13px] text-danger">{error}</span> : null}
    </label>
  );
}

const control =
  'w-full rounded-control border border-field bg-white px-[18px] text-[15.8px] text-ink outline-none transition placeholder:text-[#0a0a0a]/50 focus:border-brand focus:ring-2 focus:ring-brand/15';

export function TextInput({ className, invalid, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...rest} className={cn(control, 'h-[53px]', invalid && 'border-danger', className)} />;
}

/** Native date picker with the design's orange calendar badge. Value is yyyy-mm-dd. */
export function DateInput({ className, invalid, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <input
        type="date"
        {...rest}
        className={cn(control, 'relative h-[53px] pr-12', !rest.value && 'text-[#0a0a0a]/50', invalid && 'border-danger', className)}
      />
      <span className="pointer-events-none absolute top-1/2 right-4 grid size-[21px] -translate-y-1/2 place-items-center rounded-[5px] bg-brand">
        <Calendar className="size-3.5 text-white" strokeWidth={2.5} />
      </span>
    </div>
  );
}

export function TextArea({ className, invalid, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...rest} className={cn(control, 'min-h-[100px] resize-none py-3.5', invalid && 'border-danger', className)} />;
}

export function Select({
  options,
  placeholder = 'Select',
  className,
  invalid,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: readonly string[]; placeholder?: string; invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        {...rest}
        className={cn(control, 'h-[53px] appearance-none pr-12', !rest.value && 'text-[#0a0a0a]/50', invalid && 'border-danger', className)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o} className="text-ink">
            {o}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-4 grid size-[21px] -translate-y-1/2 place-items-center rounded-[5px] bg-brand">
        <ChevronDown className="size-4 text-white" strokeWidth={2.5} />
      </span>
    </div>
  );
}

/* ---------- Status ---------- */

const BADGE: Record<AccountStatus, string> = {
  incomplete: 'bg-muted/10 text-muted',
  under_review: 'bg-brand/10 text-brand',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
  blacklisted: 'bg-navy/10 text-navy',
};

export function StatusBadge({ status, className }: { status: AccountStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[27px] items-center rounded-full px-[11px] text-[13.5px] font-medium whitespace-nowrap',
        BADGE[status] ?? BADGE.incomplete,
        className,
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Avatar({ letter, size = 40, rounded = 'full' }: { letter: string; size?: number; rounded?: 'full' | 'card' }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center bg-linear-to-r from-brand to-brand-light font-semibold text-white',
        rounded === 'full' ? 'rounded-full' : 'rounded-card',
      )}
      style={{ width: size, height: size, fontSize: size >= 45 ? 15.8 : 13.5 }}
    >
      {letter}
    </span>
  );
}

/* ---------- Feedback ---------- */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-6 animate-spin text-brand', className)} />;
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Spinner className="size-8" />
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <div className="rounded-control border border-danger/20 bg-danger/5 px-4 py-3 text-[14px] text-danger">{children}</div>;
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40" onMouseDown={onClose}>
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className={cn('relative w-full max-w-[514px] min-w-0 rounded-card bg-white shadow-2xl', className)}
      >
        {children}
      </div>
      </div>
    </div>
  );
}

export function ModalClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-muted hover:bg-page sm:top-5 sm:right-5"
    >
      <X className="size-5" />
    </button>
  );
}
