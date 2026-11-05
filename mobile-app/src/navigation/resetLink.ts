import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

/**
 * The "Reset Password" button in the reset email opens kd-ascend.vercel.app/reset-password?token=…,
 * and that page hands the token to the app as hireloop://reset-password?token=…
 * Returns the token from the newest such link (the one that opened the app, or one tapped while it runs).
 */
export function parseResetToken(url: string | null | undefined): string | null {
  if (!url || !/reset-password/i.test(url)) return null;
  const m = /[?&]token=([a-f0-9]{64})(?:&|#|$)/i.exec(url);
  return m ? m[1].toLowerCase() : null;
}

export function useResetLink() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    Linking.getInitialURL()
      .then((url) => {
        const t = parseResetToken(url);
        if (t) setToken(t);
      })
      .catch(() => undefined);
    const sub = Linking.addEventListener('url', ({ url }) => {
      const t = parseResetToken(url);
      if (t) setToken(t);
    });
    return () => sub.remove();
  }, []);
  return { token, clear: () => setToken(null) };
}
