import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';

/** pending = added, not live yet · active = can post jobs · inactive = paused */
export type CorporateStatus = 'pending' | 'active' | 'inactive';

export const CORPORATE_STATUSES: { value: CorporateStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const INDUSTRIES = [
  'Hospitality',
  'Food & Beverage',
  'Events',
  'Retail',
  'Logistics',
  'Healthcare',
  'Education',
  'Technology',
  'Finance',
  'Real Estate',
  'Manufacturing',
  'Other',
] as const;

export type CorporateInput = {
  name: string;
  industry: string;
  location: string;
  status: CorporateStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

/** One user restricted from this corporate's jobs (corporates/{id}.blacklist.{uid}). */
export type BlacklistEntry = {
  reason?: string;
  addedAt?: Timestamp | null;
  addedBy?: string;
};

export type Corporate = CorporateInput & {
  id: string;
  /** Sequential number behind the Corporate ID: CRP-01, CRP-02 … */
  corporateNo?: number;
  /** Users who can't view or apply to this corporate's jobs, keyed by user uid. */
  blacklist?: Record<string, BlacklistEntry>;
  /** Filled in once the Jobs module exists. */
  completedJobs?: number;
  activeJobs?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  createdBy?: string;
};

const col = collection(db, 'corporates');
const ref = (id: string) => doc(db, 'corporates', id);
const adminId = () => auth.currentUser?.email ?? auth.currentUser?.uid ?? 'admin';

const clean = (c: Partial<CorporateInput>) => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(c)) if (typeof v === 'string') out[k] = v.trim();
  if (out.contactEmail) out.contactEmail = out.contactEmail.toLowerCase();
  return out;
};

export function subscribeCorporates(onData: (list: Corporate[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    col,
    (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as Omit<Corporate, 'id'>), id: d.id }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() ?? Date.now()) - (a.createdAt?.toMillis?.() ?? Date.now()));
      onData(list);
    },
    onError,
  );
}

export function subscribeCorporate(id: string, onData: (c: Corporate | null) => void, onError: (e: Error) => void) {
  return onSnapshot(
    ref(id),
    (snap) => onData(snap.exists() ? ({ ...(snap.data() as Omit<Corporate, 'id'>), id: snap.id }) : null),
    onError,
  );
}

export async function createCorporate(input: CorporateInput): Promise<string> {
  const res = await addDoc(col, {
    ...clean(input),
    completedJobs: 0,
    activeJobs: 0,
    createdBy: adminId(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return res.id;
}

export const updateCorporate = (id: string, data: Partial<CorporateInput>) =>
  updateDoc(ref(id), { ...clean(data), updatedAt: serverTimestamp() });

export const setCorporateStatus = (id: string, status: CorporateStatus) =>
  updateDoc(ref(id), { status, updatedAt: serverTimestamp() });

export const deleteCorporate = (id: string) => deleteDoc(ref(id));

export const corporateStatusLabel = (s: CorporateStatus | string) =>
  CORPORATE_STATUSES.find((x) => x.value === s)?.label ?? s;

/** Corporate ID shown in the dashboard: CRP-01, CRP-02 … ("CRP-…" until the number is assigned). */
export const corporateCode = (c: Pick<Corporate, 'corporateNo'>) =>
  c.corporateNo ? `CRP-${String(c.corporateNo).padStart(2, '0')}` : 'CRP-…';

const counterRef = () => doc(db, 'counters', 'corporates');

/**
 * Gives every corporate without a number the next one from counters/corporates, oldest first.
 * Numbers are never reused, so deleting a corporate doesn't change anyone else's ID.
 */
export async function assignCorporateNumbers(list: Corporate[]): Promise<number> {
  const missing = list
    .filter((c) => !c.corporateNo)
    .sort((a, b) => (a.createdAt?.toMillis?.() ?? Infinity) - (b.createdAt?.toMillis?.() ?? Infinity))
    .slice(0, 200);
  if (!missing.length) return 0;
  return runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef());
    let highest = (counter.data()?.last as number | undefined) ?? 0;
    list.forEach((c) => {
      if (c.corporateNo && c.corporateNo > highest) highest = c.corporateNo;
    });
    const refs = missing.map((c) => ref(c.id));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    let assigned = 0;
    snaps.forEach((snap, i) => {
      if (!snap.exists() || (snap.data() as Corporate).corporateNo) return;
      highest += 1;
      tx.update(refs[i], { corporateNo: highest });
      assigned += 1;
    });
    tx.set(counterRef(), { last: highest }, { merge: true });
    return assigned;
  });
}

/* ---------- Blacklist ---------- */

export const blacklistedUids = (c: Pick<Corporate, 'blacklist'>) => Object.keys(c.blacklist ?? {});

export const addToBlacklist = (corporateId: string, uid: string, reason: string) =>
  updateDoc(ref(corporateId), {
    [`blacklist.${uid}`]: { reason: reason.trim(), addedAt: serverTimestamp(), addedBy: adminId() },
    updatedAt: serverTimestamp(),
  });

export const removeFromBlacklist = (corporateId: string, uid: string) =>
  updateDoc(ref(corporateId), { [`blacklist.${uid}`]: deleteField(), updatedAt: serverTimestamp() });
