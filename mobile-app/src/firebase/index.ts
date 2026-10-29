/**
 * Firebase instances (React Native Firebase, modular API).
 * Native config comes from google-services.json / GoogleService-Info.plist — see README.
 */
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { config } from '../config';

export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();
export const functions = getFunctions(getApp(), config.functionsRegion);

/** Error shaped like a Firebase callable error ({ code, message }) so errors.ts handles both. */
class ServerError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Calls a server function by name. With config.apiBaseUrl set, it goes to the admin
 * dashboard's endpoint (POST {apiBaseUrl}/api/fn/{name}); otherwise to Firebase Cloud Functions.
 */
export async function callFunction<TResult, TData = Record<string, unknown>>(
  name: string,
  data?: TData,
): Promise<TResult> {
  if (!config.apiBaseUrl) {
    const fn = httpsCallable<TData, TResult>(functions, name);
    const res = await fn(data as TData);
    return res.data as TResult;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let res: Response;
  try {
    res = await fetch(`${config.apiBaseUrl.replace(/\/$/, '')}/api/fn/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data: data ?? {} }),
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = (e as { name?: string })?.name === 'AbortError';
    throw new ServerError(
      aborted ? 'deadline-exceeded' : 'unavailable',
      aborted ? 'The request timed out.' : 'Service unavailable. Check your connection and try again.',
    );
  } finally {
    clearTimeout(timer);
  }

  const body = (await res.json().catch(() => null)) as
    | { result?: TResult; error?: { code?: string; message?: string } }
    | null;
  if (!res.ok || !body || body.error) {
    throw new ServerError(body?.error?.code ?? (res.status === 404 ? 'not-found' : 'internal'), body?.error?.message ?? '');
  }
  return body.result as TResult;
}
