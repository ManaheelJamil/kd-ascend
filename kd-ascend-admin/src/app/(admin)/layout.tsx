'use client';

import { Suspense, useEffect, useState } from 'react';
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
      <div className="min-h-screen lg:pl-[260px] xl:pl-[324px]">
        <Suspense fallback={<div className="h-[68px] border-b border-line md:h-[108px]" />}>
          <Header onMenu={() => setMenuOpen(true)} />
        </Suspense>
        <main className="px-4 pt-5 pb-12 sm:px-5 md:pt-[27px] md:pr-[49px] md:pl-[27px]">{children}</main>
      </div>
    </UsersDataProvider>
  );
}
