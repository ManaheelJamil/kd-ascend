import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { toDate } from './format';
import type { UserDoc } from './types';

/**
 * Sequential user IDs: KD01U, KD02U, KD03U …
 * Each user gets a permanent number (users/{uid}.userNo) from the counter in counters/users.
 * Numbers are never reused, so deleting a user doesn't change anyone else's ID.
 * New sign-ups are numbered automatically the next time an admin has the dashboard open.
 */
const counterRef = () => doc(db, 'counters', 'users');

export async function assignUserNumbers(users: UserDoc[]): Promise<number> {
  // Oldest first, so existing users are numbered in the order they joined.
  const missing = users
    .filter((u) => !u.userNo)
    .sort((a, b) => (toDate(a.createdAt)?.getTime() ?? Infinity) - (toDate(b.createdAt)?.getTime() ?? Infinity))
    .slice(0, 200);
  if (!missing.length) return 0;

  return runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef());
    let highest = (counter.data()?.last as number | undefined) ?? 0;
    // Never hand out a number that is already taken (e.g. counter reset by hand).
    users.forEach((u) => {
      if (u.userNo && u.userNo > highest) highest = u.userNo;
    });
    const refs = missing.map((u) => doc(db, 'users', u.uid));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    let assigned = 0;
    snaps.forEach((snap, i) => {
      if (!snap.exists() || (snap.data() as UserDoc).userNo) return; // deleted or numbered meanwhile
      highest += 1;
      tx.update(refs[i], { userNo: highest });
      assigned += 1;
    });
    tx.set(counterRef(), { last: highest }, { merge: true });
    return assigned;
  });
}
