'use client';

import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Files kept inside Firestore, so ID documents and bank statements work on the free Spark plan
 * (Firebase Storage needs Blaze). Same format as the mobile app (src/services/fileStore.ts):
 *
 *   userFiles/{fileId}               { owner, name, contentType, size, chunkCount, complete, createdAt }
 *   userFiles/{fileId}/chunks/{n}    { index, data }   ← base64, ~700 KB per chunk
 *
 * StoredFile.path is "firestore:{fileId}". Only the owner and admins can read them (firestore.rules).
 */
export const FIRESTORE_PREFIX = 'firestore:';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const CHUNK_CHARS = 700_000;

export const isFirestoreFile = (path?: string | null) => !!path && path.startsWith(FIRESTORE_PREFIX);

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function toBase64(file: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

/** Saves a file for a user; returns the StoredFile path ("firestore:…"). */
export async function saveFileToFirestore(owner: string, file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error('This file is larger than 10 MB. Please choose a smaller file.');
  const data = await toBase64(file);
  const id = newId();
  const chunks: string[] = [];
  for (let i = 0; i < data.length; i += CHUNK_CHARS) chunks.push(data.slice(i, i + CHUNK_CHARS));
  const meta = doc(db, 'userFiles', id);
  await setDoc(meta, {
    owner,
    name: file.name,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    chunkCount: chunks.length,
    complete: false,
    createdAt: serverTimestamp(),
  });
  for (let i = 0; i < chunks.length; i++) {
    await setDoc(doc(meta, 'chunks', String(i)), { index: i, data: chunks[i] });
  }
  await setDoc(meta, { complete: true }, { merge: true });
  return `${FIRESTORE_PREFIX}${id}`;
}

/** Rebuilds a file saved in Firestore and returns a temporary browser URL for viewing it. */
export async function firestoreFileUrl(path: string): Promise<string> {
  const id = path.slice(FIRESTORE_PREFIX.length);
  const meta = await getDoc(doc(db, 'userFiles', id));
  if (!meta.exists()) throw new Error('This file could not be found. Ask the user to upload it again.');
  const info = meta.data() as { contentType?: string; chunkCount?: number };
  const snap = await getDocs(collection(db, 'userFiles', id, 'chunks'));
  const parts = snap.docs
    .map((d) => d.data() as { index: number; data: string })
    .sort((a, b) => a.index - b.index);
  if (!parts.length || (info.chunkCount && parts.length < info.chunkCount)) {
    throw new Error('This upload didn’t finish. Ask the user to upload the file again.');
  }
  const binary = atob(parts.map((p) => p.data).join(''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: info.contentType || 'application/octet-stream' }));
}
