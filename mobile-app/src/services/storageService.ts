import * as DocumentPicker from 'expo-document-picker';
import { ref, putFile } from '@react-native-firebase/storage';
import { storage } from '../firebase';
import { config } from '../config';
import type { StoredFile } from './userService';
import { isDevPrefill } from './devOtp';
import { saveFileToFirestore } from './fileStore';

export type PickedFile = { uri: string; name: string; mimeType: string; size: number | null };

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'];

/** Opens the system picker. Returns null if cancelled; throws a readable Error if the file is too big. */
export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ACCEPTED_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  if (a.size && a.size > config.maxUploadBytes) {
    throw new Error('This file is larger than 50MB. Please choose a smaller file.');
  }
  return {
    uri: a.uri,
    name: a.name ?? 'document',
    mimeType: a.mimeType ?? guessType(a.name),
    size: a.size ?? null,
  };
}

function guessType(name?: string | null) {
  const ext = name?.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'mp4') return 'video/mp4';
  return 'image/jpeg';
}

/**
 * Saves a picked file and returns its StoredFile.
 * Files go into Firestore (see fileStore.ts) so they work on the free plan; if that fails,
 * Firebase Storage (users/{uid}/{folder}/…) is tried. In test mode a failed upload is
 * recorded by name only (path starts with "not-uploaded/") instead of blocking the user.
 */
export async function uploadUserFile(uid: string, folder: string, file: PickedFile): Promise<StoredFile> {
  const details = { name: file.name, contentType: file.mimeType, size: file.size };
  try {
    return { ...details, path: await saveFileToFirestore(uid, file) };
  } catch (e) {
    if ((e as Error)?.message?.includes('larger than')) throw e;
    console.warn('[uploadUserFile] Firestore save failed, trying Storage —', (e as Error)?.message);
  }
  try {
    return await upload(uid, folder, file);
  } catch (e) {
    if (isDevPrefill()) {
      console.warn('[uploadUserFile] test mode: upload skipped —', (e as Error)?.message);
      return { ...details, path: `not-uploaded/${uid}/${folder}/${file.name}` };
    }
    throw e;
  }
}

async function upload(uid: string, folder: string, file: PickedFile): Promise<StoredFile> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : file.mimeType.split('/').pop();
  const path = `users/${uid}/${folder}/${Date.now()}.${ext}`;
  await putFile(ref(storage, path), file.uri, { contentType: file.mimeType });
  return { path, name: file.name, contentType: file.mimeType, size: file.size };
}
