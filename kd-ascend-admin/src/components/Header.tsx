'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Menu, Search, User } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuth';
import { useUsersData } from '@/context/UsersData';
import { cn } from './ui';

export default function Header({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const { admin } = useAdminAuth();
  const { counts } = useUsersData();
  const [q, setQ] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/users?q=${encodeURIComponent(q.trim())}` : '/users');
  };

  return (
    <header className="sticky top-0 z-30 flex h-[108px] items-center gap-4 border-b border-line bg-white/80 px-5 backdrop-blur md:px-[45px]">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="grid size-11 place-items-center rounded-control text-muted hover:bg-page lg:hidden"
      >
        <Menu className="size-6" />
      </button>

      <form onSubmit={submit} className="relative hidden max-w-[717px] flex-1 sm:block">
        <Search className="pointer-events-none absolute top-1/2 left-[22px] size-[22px] -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search anything..."
          className="h-[65px] w-full rounded-card bg-search pr-6 pl-[63px] text-lg outline-none placeholder:text-[#0a0a0a]/50 focus:ring-2 focus:ring-brand/20"
        />
      </form>

      <div className="ml-auto flex items-center gap-[22px]">
        <Link
          href="/users?status=under_review"
          aria-label={`${counts.under_review} users waiting for approval`}
          title={`${counts.under_review} waiting for approval`}
          className="relative grid size-[54px] place-items-center rounded-card text-muted hover:bg-page"
        >
          <Bell className="size-[27px]" strokeWidth={1.6} />
          {counts.under_review > 0 ? (
            <span className="absolute top-3 right-3 size-[11px] rounded-full bg-brand ring-2 ring-white" />
          ) : null}
        </Link>

        <div className="flex items-center gap-[18px] border-l border-field pl-[22.5px]">
          <div className="hidden text-right sm:block">
            <p className="text-lg leading-[27px] font-semibold text-ink">{admin?.name || 'Admin User'}</p>
            <p className="text-[15.8px] leading-[22px] text-muted">Administrator</p>
          </div>
          <span
            className={cn(
              'grid size-[54px] place-items-center rounded-full bg-linear-to-r from-brand to-brand-light text-white',
            )}
            title={admin?.email}
          >
            <User className="size-[27px]" strokeWidth={1.8} />
          </span>
        </div>
      </div>
    </header>
  );
}
