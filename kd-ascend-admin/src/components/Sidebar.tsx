'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, BriefcaseBusiness, CreditCard, LayoutGrid, LogOut, Settings, Users, X } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuth';
import { cn, ui } from './ui';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/corporates', label: 'Corporates', icon: Building2 },
  { href: '/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { href: '/payment', label: 'Payment', icon: CreditCard },
  { href: '/settings', label: 'Setting', icon: Settings },
];

export default function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const { logout } = useAdminAuth();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[260px] max-w-[85vw] flex-col border-r border-line bg-white transition-transform lg:translate-x-0',
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
      )}
    >
      <div className="flex h-[68px] shrink-0 items-center justify-between gap-2 border-b border-line px-4 md:h-[80px] md:px-5">
        <Link href="/dashboard" onClick={onNavigate} className="min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="KD Ascend" className="h-8 w-auto max-w-full object-contain sm:h-9 md:h-10" />
        </Link>
        <button
          type="button"
          onClick={onNavigate}
          aria-label="Close menu"
          className="grid size-9 shrink-0 place-items-center rounded-control text-muted hover:bg-page lg:hidden"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-3 md:px-4 md:pt-4">
        <ul className="flex flex-col gap-1.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    ui.navItem,
                    active ? 'bg-brand text-white shadow-brand' : 'text-muted hover:bg-page',
                  )}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-line px-3 pt-3 pb-4 md:px-4 md:pb-5">
        <button
          type="button"
          onClick={() => logout()}
          className={cn(ui.navItem, 'w-full text-muted hover:bg-page')}
        >
          <LogOut className="size-5 shrink-0" strokeWidth={1.8} />
          Logout
        </button>
      </div>
    </aside>
  );
}
