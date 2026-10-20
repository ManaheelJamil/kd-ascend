import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Web app config (Firebase console → Project settings → Your apps → Web App).
 * These values are public identifiers, not secrets — access is controlled by firestore.rules.
 * Values in .env.local (NEXT_PUBLIC_FIREBASE_*) override the defaults below.
 */
export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCnTcGSxKypGfyY5vPc99HPPwnZndDzkV0',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mobile-auth-a2081.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mobile-auth-a2081',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mobile-auth-a2081.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '56416844420',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:56416844420:web:aa45f53cc24457174f20d1',
};

export const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * A second Firebase app instance, used only to create accounts for new users.
 * Creating a user signs that user in on the instance that created it — doing it here
 * keeps the admin signed in on the main instance.
 */
export function getSecondaryAuth() {
  const name = 'admin-create-user';
  const secondary = getApps().find((a) => a.name === name) ?? initializeApp(firebaseConfig, name);
  return getAuth(secondary);
}
