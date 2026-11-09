'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, BriefcaseBusiness, CreditCard, LayoutGrid, LogOut, Settings, Users, X } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuth';
import { cn } from './ui';

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
        'fixed inset-y-0 left-0 z-40 flex w-[280px] max-w-[85vw] flex-col border-r border-line bg-white transition-transform lg:w-[260px] lg:translate-x-0 2xl:w-[324px]',
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
      )}
    >
      <div className="flex h-[68px] shrink-0 items-center justify-between gap-2 border-b border-line px-5 md:h-[108px] 2xl:px-9">
        <Link href="/dashboard" onClick={onNavigate} className="min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="KD Ascend" className="h-10 w-auto max-w-full object-contain md:h-[54px]" />
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

      <nav className="flex-1 overflow-y-auto px-4 pt-4 2xl:px-[22.5px] 2xl:pt-[22.5px]">
        <ul className="flex flex-col gap-[9px]">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    'flex h-[52px] items-center gap-[13.5px] rounded-card px-[18px] text-base font-medium transition 2xl:h-[58px] 2xl:px-[22.5px] 2xl:text-lg',
                    active ? 'bg-brand text-white shadow-brand' : 'text-muted hover:bg-page',
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-line px-4 pt-4 pb-5 2xl:px-[22.5px] 2xl:pt-[23.5px] 2xl:pb-6">
        <button
          type="button"
          onClick={() => logout()}
          className="flex h-[52px] w-full items-center gap-[13.5px] rounded-card px-[18px] text-base font-medium text-muted transition hover:bg-page 2xl:h-[58px] 2xl:px-[22.5px] 2xl:text-lg"
        >
          <LogOut className="size-[22px]" strokeWidth={1.8} />
          Logout
        </button>
      </div>
    </aside>
  );
}
