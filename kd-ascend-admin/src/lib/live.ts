import type { Unsubscribe } from 'firebase/firestore';

/**
 * A Firestore listener shared by every screen of the dashboard.
 * The first caller starts it; afterwards `get()` returns the latest snapshot synchronously,
 * so helpers such as getJob() keep working without waiting, and `subscribe()` re-renders
 * screens whenever Firestore pushes a change (real time, also from other admins' sessions).
 */
export type LiveStore<T> = {
  /** Latest value (the initial value until the first snapshot arrives). */
  get: () => T;
  /** True once the first snapshot has arrived. */
  isReady: () => boolean;
  /** Resolves after the first snapshot (or the first error). */
  ready: () => Promise<void>;
  subscribe: (onData: (value: T) => void, onError?: (e: Error) => void) => () => void;
};

export function liveStore<T>(
  initial: T,
  attach: (set: (value: T) => void, fail: (e: Error) => void) => Unsubscribe,
): LiveStore<T> {
  let value = initial;
  let ready = false;
  let lastError: Error | null = null;
  let unsub: Unsubscribe | null = null;
  const listeners = new Set<{ onData: (v: T) => void; onError?: (e: Error) => void }>();
  let waiters: (() => void)[] = [];

  const release = () => {
    const w = waiters;
    waiters = [];
    w.forEach((r) => r());
  };

  const ensure = () => {
    if (unsub || typeof window === 'undefined') return;
    unsub = attach(
      (v) => {
        value = v;
        ready = true;
        lastError = null;
        release();
        listeners.forEach((l) => l.onData(v));
      },
      (e) => {
        lastError = e;
        // Typically "permission denied" before the admin has signed in: start again next time.
        unsub?.();
        unsub = null;
        release();
        listeners.forEach((l) => l.onError?.(e));
      },
    );
  };

  return {
    get: () => {
      ensure();
      return value;
    },
    isReady: () => ready,
    ready: () => {
      ensure();
      if (ready || lastError) return Promise.resolve();
      return new Promise<void>((r) => waiters.push(r));
    },
    subscribe: (onData, onError) => {
      const l = { onData, onError };
      listeners.add(l);
      ensure();
      if (ready) onData(value);
      else if (lastError) onError?.(lastError);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

/** Firestore rejects `undefined` values: drop them. */
export function withoutUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as T;
}

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
