/**
 * Files kept inside Firestore, so ID documents and bank statements are saved on the free Spark
 * plan (Firebase Storage needs Blaze). The admin dashboard reads them back (src/lib/fileStore.ts):
 *
 *   userFiles/{fileId}               { owner, name, contentType, size, chunkCount, complete, createdAt }
 *   userFiles/{fileId}/chunks/{n}    { index, data }   ← base64, ~700 KB per chunk
 *
 * StoredFile.path becomes "firestore:{fileId}". Only the owner and admins can read them.
 */
import { doc, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { db } from '../firebase';

export const FIRESTORE_PREFIX = 'firestore:';
export const MAX_FIRESTORE_FILE_BYTES = 10 * 1024 * 1024;
const CHUNK_CHARS = 700_000;

function newId() {
  const chars = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 24; i++) id += chars[Math.floor(Math.random() * 16)];
  return id;
}

/** Reads a local file (file:// or content://) as base64 without extra native modules. */
async function readBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

export async function saveFileToFirestore(
  owner: string,
  file: { uri: string; name: string; mimeType: string; size: number | null },
): Promise<string> {
  if (file.size && file.size > MAX_FIRESTORE_FILE_BYTES) {
    throw new Error('This file is larger than 10 MB. Please choose a smaller file or take a lower-resolution photo.');
  }
  const data = await readBase64(file.uri);
  if (data.length > (MAX_FIRESTORE_FILE_BYTES * 4) / 3 + 4) {
    throw new Error('This file is larger than 10 MB. Please choose a smaller file or take a lower-resolution photo.');
  }
  const id = newId();
  const meta = doc(db, 'userFiles', id);
  const chunks: string[] = [];
  for (let i = 0; i < data.length; i += CHUNK_CHARS) chunks.push(data.slice(i, i + CHUNK_CHARS));

  await setDoc(meta, {
    owner,
    name: file.name,
    contentType: file.mimeType,
    size: file.size ?? Math.round((data.length * 3) / 4),
    chunkCount: chunks.length,
    complete: false,
    createdAt: serverTimestamp(),
  });
  for (let i = 0; i < chunks.length; i++) {
    await setDoc(doc(db, 'userFiles', id, 'chunks', String(i)), { index: i, data: chunks[i] });
  }
  await setDoc(meta, { complete: true }, { merge: true });
  return `${FIRESTORE_PREFIX}${id}`;
}
