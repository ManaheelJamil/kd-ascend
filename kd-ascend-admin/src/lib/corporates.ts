import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
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

export type Corporate = CorporateInput & {
  id: string;
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
