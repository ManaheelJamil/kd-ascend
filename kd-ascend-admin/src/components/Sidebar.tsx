'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, BriefcaseBusiness, CreditCard, LayoutGrid, LogOut, Settings, Users } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuth';
import { useBranding } from '@/lib/settings';
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
  const { logo } = useBranding();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[324px] flex-col border-r border-line bg-white transition-transform lg:translate-x-0',
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
      )}
    >
      <div className="flex h-[127px] shrink-0 items-start border-b border-line px-9 pt-9">
        <Link href="/dashboard" onClick={onNavigate}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="KD Ascend" className="h-[54px] w-auto max-w-[252px] object-contain" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-[22.5px] pt-[22.5px]">
        <ul className="flex flex-col gap-[9px]">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    'flex h-[58px] items-center gap-[13.5px] rounded-card px-[22.5px] text-lg font-medium transition',
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

      <div className="shrink-0 border-t border-line px-[22.5px] pt-[23.5px] pb-6">
        <button
          type="button"
          onClick={() => logout()}
          className="flex h-[58px] w-full items-center gap-[13.5px] rounded-card px-[22.5px] text-lg font-medium text-muted transition hover:bg-page"
        >
          <LogOut className="size-[22px]" strokeWidth={1.8} />
          Logout
        </button>
      </div>
    </aside>
  );
}
