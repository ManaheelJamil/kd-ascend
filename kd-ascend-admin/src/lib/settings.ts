'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Dashboard-wide settings live in /settings/branding.
 * The logo is stored as a small data URL so it works without Firebase Storage.
 */
export type Branding = { logo: string | null };

const brandingRef = () => doc(db, 'settings', 'branding');

export function subscribeBranding(cb: (b: Branding) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    brandingRef(),
    (snap) => cb({ logo: (snap.data()?.logo as string | undefined) || null }),
    (e) => onError?.(e),
  );
}

export async function saveLogo(logo: string | null) {
  await setDoc(brandingRef(), { logo, updatedAt: serverTimestamp() }, { merge: true });
}

/** Live company logo; falls back to the bundled /logo.png. */
export function useBranding() {
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => {
    try {
      return subscribeBranding((b) => setLogo(b.logo), () => setLogo(null));
    } catch {
      return undefined;
    }
  }, []);
  return { logo: logo || '/logo.png', custom: !!logo };
}

const MAX_SIDE = 480;
const MAX_BYTES = 700_000; // Firestore documents are limited to 1 MiB.

/** Reads an image file and scales it down so it fits comfortably in a Firestore document. */
export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (PNG, JPG, SVG or WebP).');
  if (file.size > 10 * 1024 * 1024) throw new Error('That image is larger than 10 MB. Please choose a smaller file.');

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = img.naturalWidth || MAX_SIDE;
    const h = img.naturalHeight || MAX_SIDE;
    const k = Math.min(1, MAX_SIDE / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * k));
    canvas.height = Math.max(1, Math.round(h * k));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not read that image.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL('image/png');
    if (data.length > MAX_BYTES) data = canvas.toDataURL('image/webp', 0.85);
    if (data.length > MAX_BYTES) data = canvas.toDataURL('image/jpeg', 0.8);
    if (data.length > MAX_BYTES) throw new Error('That image is too detailed to store. Please choose a simpler logo.');
    return data;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('That')) throw e;
    throw new Error('Could not read that image. Please try a PNG or JPG file.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
