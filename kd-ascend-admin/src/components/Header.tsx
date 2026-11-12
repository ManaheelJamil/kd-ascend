'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Menu, Search, User, X } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuth';
import { cn } from './ui';
import Notifications from './Notifications';

/**
 * Top search bar. On Corporates pages it searches corporates (/corporates?q=);
 * everywhere else it searches the Pending Approvals list on the Users page (?q= in the URL).
 */
export default function Header({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const { admin } = useAdminAuth();
  const pathname = usePathname();
  const params = useSearchParams();
  const corporates = pathname.startsWith('/corporates');
  const target = corporates ? '/corporates' : '/users';
  const onUsers = pathname === target; // on the page the search filters
  const urlQ = onUsers ? (params.get('q') ?? '') : '';
  const label = corporates ? 'Search corporates' : 'Search pending approvals';
  const [q, setQ] = useState(urlQ);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQ(urlQ), [urlQ]);

  const go = (value: string, replace: boolean) => {
    const sp = new URLSearchParams(onUsers ? params.toString() : '');
    if (value.trim()) sp.set('q', value.trim());
    else sp.delete('q');
    const url = `${target}${sp.toString() ? `?${sp}` : ''}`;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url);
  };

  // On the Users page the pending list filters while typing; elsewhere Enter opens the Users page.
  const change = (value: string) => {
    setQ(value);
    if (!onUsers) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(value, true), 250);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    go(q, onUsers);
  };

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center gap-2 border-b border-line bg-white/90 px-3 backdrop-blur sm:gap-4 sm:px-5 md:h-[108px] md:px-6 2xl:px-[45px]">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="grid size-10 shrink-0 place-items-center rounded-control text-muted hover:bg-page sm:size-11 lg:hidden"
      >
        <Menu className="size-6" />
      </button>

      <form onSubmit={submit} className="relative min-w-0 max-w-[717px] flex-1" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted md:left-[22px] md:size-[22px]" />
        <input
          value={q}
          onChange={(e) => change(e.target.value)}
          placeholder={`${label}...`}
          aria-label={label}
          className="h-11 w-full rounded-control bg-search pr-10 pl-10 text-[15px] outline-none placeholder:text-[#0a0a0a]/50 focus:ring-2 focus:ring-brand/20 md:h-[65px] md:rounded-card md:pr-14 md:pl-[63px] md:text-lg"
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              if (timer.current) clearTimeout(timer.current);
              setQ('');
              if (onUsers) go('', true);
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-white md:right-4 md:size-9"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3 md:gap-[22px]">
        <Notifications />

        <div className="flex items-center gap-[18px] md:border-l md:border-field md:pl-[22.5px]">
          <div className="hidden text-right xl:block">
            <p className="text-lg leading-[27px] font-semibold text-ink">{admin?.name || 'Admin User'}</p>
            <p className="text-[15.8px] leading-[22px] text-muted">Administrator</p>
          </div>
          <Link
            href="/settings"
            className={cn(
              'grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-linear-to-r from-brand to-brand-light text-white md:size-[54px]',
            )}
            title={`${admin?.email ?? ''} · Settings`}
            aria-label="Profile settings"
          >
            {admin?.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={admin.photo} alt="" className="size-full object-cover" />
            ) : (
              <User className="size-5 md:size-[27px]" strokeWidth={1.8} />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
