import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { BookingSubmittedModal, CancelBookingModal, ConfirmBookingModal } from '../components/JobModals';
import { RATE_MAX, type JobFilters } from '../components/JobFilterSheet';
import {
  JobActionError,
  applyToJob,
  cancelBooking,
  eventStartMs,
  isLateCancel,
  findTimeConflict,
  hourlyRate,
  slotsLeft,
  subscribeMyBookings,
  subscribeOpenJobs,
  type Booking,
  type Job,
} from '../services/jobsService';

/** Open jobs, live. */
export function useOpenJobs(uid: string | undefined) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    return subscribeOpenJobs(
      uid,
      (j) => {
        setJobs(j);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError('We couldn’t load jobs. Check your connection and try again.');
      },
    );
  }, [uid]);
  return { jobs, loading, error };
}

/** My bookings (applications + their jobs), live. */
export function useMyBookings(uid: string | undefined) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    return subscribeMyBookings(
      uid,
      (b) => {
        setBookings(b);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError('We couldn’t load your bookings. Check your connection and try again.');
      },
    );
  }, [uid]);
  return { bookings, loading, error };
}

export type ApplyState = { label: string; disabled: boolean; reason?: string };

/** What the Apply button says for one job. */
export function applyState(job: Job, bookings: Booking[]): ApplyState {
  const mine = bookings.find((b) => b.job.id === job.id);
  if (mine?.app.status === 'pending') return { label: 'Applied', disabled: true };
  if (mine?.app.status === 'approved') return { label: 'Booked', disabled: true };
  if (mine?.app.status === 'rejected') return { label: 'Not Selected', disabled: true };
  if (slotsLeft(job) === 0) return { label: 'Fully Booked', disabled: true };
  const clash = findTimeConflict(job, bookings);
  if (clash) return { label: 'Time Clash', disabled: true, reason: clash.title };
  return { label: 'Apply', disabled: false };
}

/** Whether the member can apply right now (filter "Only show jobs I can apply for"). */
export function canApply(job: Job, bookings: Booking[]): boolean {
  return !applyState(job, bookings).disabled;
}

/**
 * Apply flow: Confirm Your Booking → Booking Submitted. Returns `start(job)` and the popups
 * to render once on the screen.
 */
export function useApplyFlow(bookings: Booking[], onDone: () => void) {
  const { profile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const start = useCallback(
    (j: Job) => {
      const state = applyState(j, bookings);
      if (state.disabled) {
        if (state.reason) Alert.alert('Time clash', `You’re already booked for “${state.reason}” at the same time.`);
        return;
      }
      setJob(j);
    },
    [bookings],
  );

  const confirm = async () => {
    if (!job || !profile) return;
    setBusy(true);
    try {
      await applyToJob(job, profile, bookings);
      setJob(null);
      setSubmitted(true);
    } catch (e) {
      const msg =
        e instanceof JobActionError
          ? e.message
          : (e as { code?: string }).code === 'firestore/permission-denied'
            ? 'This job is no longer taking applications from your account.'
            : 'Something went wrong. Please try again.';
      setJob(null);
      Alert.alert('Couldn’t book this job', msg);
    } finally {
      setBusy(false);
    }
  };

  const modals = useMemo(
    () => (
      <>
        <ConfirmBookingModal
          job={job}
          visible={!!job}
          busy={busy}
          onConfirm={confirm}
          onClose={() => !busy && setJob(null)}
        />
        <BookingSubmittedModal
          visible={submitted}
          onHome={() => {
            setSubmitted(false);
            onDone();
          }}
        />
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [job, busy, submitted, bookings, profile],
  );

  return { start, modals };
}

/* ------------------------------------------------------------------ filtering / sorting */


export type JobSort = 'Latest' | 'Event Date' | 'Highest Pay';
export const JOB_SORTS: JobSort[] = ['Latest', 'Event Date', 'Highest Pay'];

export function filterJobs(
  jobs: Job[],
  opts: { filters: JobFilters; bookings: Booking[]; query?: string; sort?: JobSort },
): Job[] {
  const { filters: f, bookings } = opts;
  const q = (opts.query ?? '').trim().toLowerCase();
  const out = jobs.filter((j) => {
    if (f.company && j.corporateName !== f.company) return false;
    if (f.role && j.title !== f.role) return false;
    const rate = hourlyRate(j.salary);
    if (rate != null && (rate < f.minRate || (f.maxRate < RATE_MAX && rate > f.maxRate))) return false;
    if (f.onlyApplicable && !canApply(j, bookings)) return false;
    if (q) {
      const hay = `${j.title} ${j.corporateName} ${j.location} ${j.jobId}`.toLowerCase();
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const sort = opts.sort ?? 'Event Date';
  if (sort === 'Latest') out.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  else if (sort === 'Highest Pay') out.sort((a, b) => (hourlyRate(b.salary) ?? 0) - (hourlyRate(a.salary) ?? 0));
  else out.sort((a, b) => (eventStartMs(a) ?? 0) - (eventStartMs(b) ?? 0));
  return out;
}

export function distinct(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** Cancel flow: Cancel Booking popup (with the late-cancel warning) → cancelled. */
export function useCancelFlow(onDone?: () => void) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!booking) return;
    setBusy(true);
    try {
      await cancelBooking(booking);
      setBooking(null);
      Alert.alert(
        'Booking cancelled',
        isLateCancel(booking.job)
          ? 'Your booking has been cancelled. As it was within 24 hours of the shift, a $50 penalty applies.'
          : 'Your booking has been cancelled.',
      );
      onDone?.();
    } catch (e) {
      setBooking(null);
      Alert.alert(
        'Couldn’t cancel',
        e instanceof JobActionError ? e.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const modal = (
    <CancelBookingModal
      job={booking?.job ?? null}
      visible={!!booking}
      late={booking ? isLateCancel(booking.job) : false}
      busy={busy}
      onConfirm={confirm}
      onClose={() => !busy && setBooking(null)}
    />
  );

  return { start: setBooking, modal };
}
