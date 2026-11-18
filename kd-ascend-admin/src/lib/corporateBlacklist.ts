import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export type CorporateBlacklistEntry = {
  uid: string;
  email: string;
  displayName: string;
  /** Shown in the table (e.g. KD02U); falls back to a short id when missing. */
  memberCode: string;
  reason: string;
  createdAt?: Timestamp | null;
  createdBy?: string;
};

const blacklistCol = (corporateId: string) => collection(db, 'corporates', corporateId, 'blacklistedUsers');

export function subscribeCorporateBlacklist(
  corporateId: string,
  onData: (entries: CorporateBlacklistEntry[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    blacklistCol(corporateId),
    (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as Omit<CorporateBlacklistEntry, 'uid'>), uid: d.id }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      onData(list);
    },
    onError,
  );
}

export async function addCorporateBlacklist(
  corporateId: string,
  entry: Pick<CorporateBlacklistEntry, 'uid' | 'email' | 'displayName' | 'memberCode'> & { reason?: string },
) {
  const admin = auth.currentUser?.email ?? auth.currentUser?.uid ?? 'admin';
  await setDoc(doc(db, 'corporates', corporateId, 'blacklistedUsers', entry.uid), {
    email: entry.email.trim().toLowerCase(),
    displayName: entry.displayName.trim(),
    memberCode: entry.memberCode.trim(),
    reason: entry.reason?.trim() || 'Restricted by admin',
    createdAt: serverTimestamp(),
    createdBy: admin,
  });
}

export async function removeCorporateBlacklist(corporateId: string, uid: string) {
  await deleteDoc(doc(db, 'corporates', corporateId, 'blacklistedUsers', uid));
}