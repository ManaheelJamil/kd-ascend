import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin, server side only. Needs FIREBASE_SERVICE_ACCOUNT: the whole JSON from
 * Firebase console → Project settings → Service accounts → Generate new private key.
 * Never put this in NEXT_PUBLIC_* variables or in the mobile app.
 */
let app: App | null = null;

export function adminApp(): App {
  if (app) return app;
  if (getApps().length) return (app = getApps()[0]);
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new ConfigError('FIREBASE_SERVICE_ACCOUNT is not set.');
  let creds: { project_id: string; client_email: string; private_key: string };
  try {
    creds = JSON.parse(raw);
  } catch {
    throw new ConfigError('FIREBASE_SERVICE_ACCOUNT is not valid JSON. Paste the whole downloaded file.');
  }
  app = initializeApp({
    credential: cert({
      projectId: creds.project_id,
      clientEmail: creds.client_email,
      // Some hosts store the key with literal "\n" sequences.
      privateKey: creds.private_key.replace(/\\n/g, '\n'),
    }),
  });
  return app;
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());

export class ConfigError extends Error {}

export function mailSettings() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '');
  if (!user || !pass) throw new ConfigError('SMTP_USER / SMTP_PASS are not set.');
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    user,
    pass,
    from: process.env.MAIL_FROM || `KD Ascend <${user}>`,
    appName: process.env.APP_NAME || 'KD Ascend',
  };
}

/** Which server settings are present (shown by GET /api/fn/health). */
export function configStatus() {
  return {
    firebaseServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    smtpUser: !!process.env.SMTP_USER,
    smtpPass: !!process.env.SMTP_PASS,
  };
}
