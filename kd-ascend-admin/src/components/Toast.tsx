'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from './ui';

type ToastItem = { id: number; message: string; tone: 'success' | 'error' };

const ToastContext = createContext<{ success: (message: string) => void; error: (message: string) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastItem['tone']) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setItems((list) => [...list, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ success: (m) => push(m, 'success'), error: (m) => push(m, 'error') }}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-6 z-[200] flex w-[min(100%,360px)] flex-col gap-2 sm:right-6">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-card border px-4 py-3.5 shadow-lg',
              t.tone === 'success' ? 'border-success/20 bg-white text-ink' : 'border-danger/20 bg-white text-ink',
            )}
          >
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full',
                t.tone === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
              )}
            >
              {t.tone === 'success' ? <Check className="size-4" strokeWidth={2.5} /> : <X className="size-4" strokeWidth={2.5} />}
            </span>
            <p className="min-w-0 flex-1 pt-0.5 text-[14.5px] font-medium leading-snug">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-muted hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}