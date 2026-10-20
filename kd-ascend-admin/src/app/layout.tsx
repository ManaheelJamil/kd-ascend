import type { Metadata } from 'next';
import { AdminAuthProvider } from '@/context/AdminAuth';
import './globals.css';

export const metadata: Metadata = {
  title: 'KD Ascend Admin',
  description: 'Manage KD Ascend users, approvals and the blacklist.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Loaded by the browser, so a slow or blocked Google Fonts never breaks the build;
            the system font is used until (or if) it loads. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-page font-sans text-ink antialiased">
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}
