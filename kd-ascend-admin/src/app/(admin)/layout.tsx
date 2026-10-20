'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { FullPageSpinner } from '@/components/ui';
import { useAdminAuth } from '@/context/AdminAuth';
import { UsersDataProvider } from '@/context/UsersData';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, admin } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !admin) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, admin, router, pathname]);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (loading || !admin) return <FullPageSpinner />;

  return (
    <UsersDataProvider>
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen ? (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden />
      ) : null}
      <div className="min-h-screen lg:pl-[324px]">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="px-5 pt-[27px] pb-12 md:pr-[49px] md:pl-[27px]">{children}</main>
      </div>
    </UsersDataProvider>
  );
}
