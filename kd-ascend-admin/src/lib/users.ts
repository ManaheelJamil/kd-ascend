import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, getSecondaryAuth, storage } from './firebase';
import { firestoreFileUrl, isFirestoreFile, saveFileToFirestore } from './fileStore';
import { resubmitLabels } from './resubmit';
import type { Payout, PersonalInfo, StoredFile, UserDoc } from './types';

const usersCol = collection(db, 'users');
const userRef = (uid: string) => doc(db, 'users', uid);
const adminId = () => auth.currentUser?.email ?? auth.currentUser?.uid ?? 'admin';

type NotifyEvent = 'approved' | 'rejected' | 'blacklisted' | 'restored';

/**
 * Emails the user about an admin decision (templates live in src/server/emailTemplates.ts).
 * Runs in the background: the status change is already saved, so a mail problem never blocks the admin.
 */
function notify(uid: string, event: NotifyEvent, reason?: string) {
  const user = auth.currentUser;
  if (!user) return;
  user
    .getIdToken()
    .then((token) =>
      fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid, event, reason }),
      }),
    )
    .catch((e) => console.warn('Notification email not sent', e));
}

/**
 * Permanently deletes a user: login account, profile, uploaded files and pending codes.
 * Runs on the server (/api/admin/delete-user) because only it can remove the login account.
 */
export async function deleteUser(uid: string): Promise<void> {
  const current = auth.currentUser;
  if (!current) throw new Error('Please sign in again.');
  const token = await current.getIdToken();
  let res: Response;
  try {
    res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ uid }),
    });
  } catch {
    throw new Error('Network error. Check your connection and try again.');
  }
  const body = (await res.json().catch(() => null)) as { deleted?: boolean; error?: string } | null;
  if (!res.ok || !body?.deleted) throw new Error(body?.error || 'Could not delete the user. Please try again.');
}

/** Live list of every user document. */
export function subscribeUsers(onData: (users: UserDoc[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    usersCol,
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as UserDoc), uid: d.id }))),
    onError,
  );
}

/** Live single user. Calls onData(null) when the document doesn't exist. */
export function subscribeUser(uid: string, onData: (user: UserDoc | null) => void, onError: (e: Error) => void) {
  return onSnapshot(
    userRef(uid),
    (snap) => onData(snap.exists() ? ({ ...(snap.data() as UserDoc), uid: snap.id }) : null),
    onError,
  );
}

export const approveUser = async (uid: string) => {
  await updateDoc(userRef(uid), {
    status: 'approved',
    approvedAt: serverTimestamp(),
    approvedBy: adminId(),
    rejectionReason: deleteField(),
    // A blocked / rejected user who resubmitted and is now approved: clear the old decision.
    blacklistReason: deleteField(),
    blacklistedAt: deleteField(),
    blacklistedBy: deleteField(),
    resubmitFields: deleteField(),
    resubmittedFrom: deleteField(),
    updatedAt: serverTimestamp(),
  });
  notify(uid, 'approved');
};

/** Reason text for the email, plus the fields the user should fix. */
const withFields = (reason: string, fields: string[]) =>
  fields.length ? `${reason.trim()} — Please update in the app (tap Resubmit): ${resubmitLabels(fields)}.` : reason.trim();

/** fields = what the user may change when resubmitting (none = no Resubmit button). */
export const rejectUser = async (uid: string, reason: string, fields: string[] = []) => {
  await updateDoc(userRef(uid), {
    status: 'rejected',
    rejectedAt: serverTimestamp(),
    rejectedBy: adminId(),
    rejectionReason: reason.trim(),
    resubmitFields: fields.length ? fields : deleteField(),
    resubmittedFrom: deleteField(),
    updatedAt: serverTimestamp(),
  });
  notify(uid, 'rejected', withFields(reason, fields));
};

export const blacklistUser = async (uid: string, reason: string, fields: string[] = []) => {
  await updateDoc(userRef(uid), {
    status: 'blacklisted',
    blacklistedAt: serverTimestamp(),
    blacklistedBy: adminId(),
    blacklistReason: reason.trim(),
    resubmitFields: fields.length ? fields : deleteField(),
    resubmittedFrom: deleteField(),
    updatedAt: serverTimestamp(),
  });
  notify(uid, 'blacklisted', withFields(reason, fields));
};

/** "They will be able to access the platform again" → back to an approved account. */
export const removeFromBlacklist = async (uid: string) => {
  await updateDoc(userRef(uid), {
    status: 'approved',
    approvedAt: serverTimestamp(),
    approvedBy: adminId(),
    blacklistReason: deleteField(),
    blacklistedAt: deleteField(),
    blacklistedBy: deleteField(),
    resubmitFields: deleteField(),
    resubmittedFrom: deleteField(),
    updatedAt: serverTimestamp(),
  });
  notify(uid, 'restored');
};

export const updateContact = (uid: string, data: { phone: string; address: string; fullName: string }, user: UserDoc) =>
  updateDoc(userRef(uid), {
    phone: data.phone,
    profile: { ...emptyProfile(), ...(user.profile ?? {}), fullName: data.fullName, address: data.address },
    updatedAt: serverTimestamp(),
  });

export const updatePersonal = (uid: string, data: Partial<PersonalInfo>, user: UserDoc) =>
  updateDoc(userRef(uid), {
    profile: { ...emptyProfile(), ...(user.profile ?? {}), ...data },
    updatedAt: serverTimestamp(),
  });

export const updatePayout = (uid: string, payout: Payout) =>
  updateDoc(userRef(uid), { payout, updatedAt: serverTimestamp() });

/** Marks one of the user's documents as verified / rejected. */
export async function setDocumentStatus(user: UserDoc, which: DocumentRef, status: 'verified' | 'rejected') {
  if (which.kind === 'identity' && user.identityDocument) {
    return updateDoc(userRef(user.uid), {
      identityDocument: { ...user.identityDocument, status, reviewedAt: serverTimestamp() },
      updatedAt: serverTimestamp(),
    });
  }
  if (which.kind === 'statement' && user.payout?.method === 'bank' && user.payout.statement) {
    return updateDoc(userRef(user.uid), {
      payout: { ...user.payout, statement: { ...user.payout.statement, status, reviewedAt: serverTimestamp() } },
      updatedAt: serverTimestamp(),
    });
  }
  if (which.kind === 'extra' && user.documents?.[which.index]) {
    const documents = user.documents.map((d, i) => (i === which.index ? { ...d, status } : d));
    return updateDoc(userRef(user.uid), { documents, updatedAt: serverTimestamp() });
  }
}

export type DocumentRef = { kind: 'identity' } | { kind: 'statement' } | { kind: 'extra'; index: number };

export type UserDocument = { ref: DocumentRef; label: string; file: StoredFile };

/** Every document the user has, in display order. */
export function listDocuments(user: UserDoc): UserDocument[] {
  const out: UserDocument[] = [];
  if (user.identityDocument) {
    out.push({ ref: { kind: 'identity' }, label: user.identityDocument.label || 'Identity Document', file: user.identityDocument });
  }
  (user.documents ?? []).forEach((file, index) =>
    out.push({ ref: { kind: 'extra', index }, label: file.label || file.name, file }),
  );
  if (user.payout?.method === 'bank' && user.payout.statement) {
    out.push({ ref: { kind: 'statement' }, label: 'Bank Statement / Receipt', file: user.payout.statement });
  }
  return out;
}

/**
 * Download URL for a stored file, or null when the file was never uploaded
 * (test mode records only the file details while Firebase Storage isn't set up).
 */
export async function fileUrl(file: StoredFile): Promise<string | null> {
  if (!file.path || file.path.startsWith('not-uploaded/')) return null;
  if (isFirestoreFile(file.path)) return firestoreFileUrl(file.path);
  return getDownloadURL(ref(storage, file.path));
}

/** Uploads to users/{uid}/{folder}/…; falls back to recording the details only if Storage isn't available. */
export async function uploadFile(uid: string, folder: string, file: File, label?: string): Promise<StoredFile> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : file.type.split('/').pop();
  const path = `users/${uid}/${folder}/${Date.now()}.${ext}`;
  const base = { name: file.name, contentType: file.type || 'application/octet-stream', size: file.size, ...(label ? { label } : {}) };
  // Firestore file store first (works on the free plan); Firebase Storage as a fallback.
  try {
    return { ...base, path: await saveFileToFirestore(uid, file) };
  } catch (e) {
    if ((e as Error).message?.includes('larger than')) throw e;
    try {
      await uploadBytes(ref(storage, path), file, { contentType: base.contentType });
      return { ...base, path };
    } catch (e2) {
      console.warn('[uploadFile] upload failed, saving file details only:', e, e2);
      return { ...base, path: `not-uploaded/${uid}/${folder}/${file.name}` };
    }
  }
}

export type NewUserInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  nric: string;
  gender: string;
  nationality: string;
  dateOfBirth: string;
  placeOfBirth: string;
  documents: { label: string; file: File }[];
  payout: Payout;
};

/**
 * Creates the login (Firebase Authentication) and the profile (Firestore) for a new user.
 * Admin-created users are approved straight away and skip the app's onboarding steps.
 */
export async function createUser(input: NewUserInput): Promise<string> {
  const secondaryAuth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, input.email.trim().toLowerCase(), input.password);
  const uid = cred.user.uid;
  await signOut(secondaryAuth);

  const documents: StoredFile[] = [];
  for (const d of input.documents) documents.push(await uploadFile(uid, 'documents', d.file, d.label));
  const [identityDocument, ...extra] = documents;

  const profile: PersonalInfo = {
    fullName: input.fullName.trim(),
    nric: input.nric.trim().toUpperCase(),
    gender: input.gender,
    nationality: input.nationality,
    dateOfBirth: input.dateOfBirth,
    placeOfBirth: input.placeOfBirth || input.nationality,
    address: input.address.trim(),
  };

  await setDoc(userRef(uid), {
    uid,
    email: cred.user.email ?? input.email.trim().toLowerCase(),
    phone: input.phone,
    phoneVerified: true,
    emailVerified: true,
    onboardingStep: 'done',
    status: 'approved',
    profile,
    identityDocument: identityDocument ?? null,
    documents: extra,
    payout: input.payout,
    createdBy: 'admin',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
    approvedBy: adminId(),
  });
  return uid;
}

function emptyProfile(): PersonalInfo {
  return { fullName: '', nric: '', gender: '', nationality: '', dateOfBirth: '', placeOfBirth: '', address: '' };
}
