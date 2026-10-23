'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Building2, Menu, Search, User, X } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuth';
import { useUsersData } from '@/context/UsersData';
import { subscribeCorporates, type Corporate } from '@/lib/corporates';
import { displayName, initial } from '@/lib/format';
import type { AccountStatus } from '@/lib/types';
import { Avatar, StatusBadge, cn } from './ui';

type Result =
  | { kind: 'user'; id: string; title: string; sub: string; href: string; letter: string; status: AccountStatus }
  | { kind: 'corporate'; id: string; title: string; sub: string; href: string };

const MAX_RESULTS = 8;

export default function Header({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin } = useAdminAuth();
  const { counts, users } = useUsersData();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [corporates, setCorporates] = useState<Corporate[]>([]);
  const boxRef = useRef<HTMLFormElement>(null);

  // Global search on its own: it shows a results list and never changes the page's filters.
  const term = q.trim().toLowerCase();

  // Load corporates only once the admin starts searching.
  const wantCorporates = term.length > 0;
  useEffect(() => {
    if (!wantCorporates) return;
    return subscribeCorporates(setCorporates, () => setCorporates([]));
  }, [wantCorporates]);

  // Close the list when clicking elsewhere or changing page.
  useEffect(() => {
    const close = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);
  useEffect(() => {
    setOpen(false);
    setQ('');
  }, [pathname]);

  const results = useMemo<Result[]>(() => {
    if (!term) return [];
    const u: Result[] = users
      .filter((x) =>
        [displayName(x), x.email, x.phone, x.profile?.nric].filter(Boolean).join(' ').toLowerCase().includes(term),
      )
      .slice(0, MAX_RESULTS)
      .map((x) => ({
        kind: 'user',
        id: x.uid,
        title: displayName(x),
        sub: x.email,
        href: `/users/${x.uid}`,
        letter: initial(x),
        status: x.status,
      }));
    const c: Result[] = corporates
      .filter((x) =>
        [x.name, x.industry, x.location, x.contactName, x.contactEmail].filter(Boolean).join(' ').toLowerCase().includes(term),
      )
      .slice(0, MAX_RESULTS)
      .map((x) => ({ kind: 'corporate', id: x.id, title: x.name, sub: [x.industry, x.location].filter(Boolean).join(' · '), href: `/corporates/${x.id}` }));
    return [...u, ...c].slice(0, MAX_RESULTS);
  }, [term, users, corporates]);

  useEffect(() => setActive(0), [term]);

  const openResult = (r: Result) => {
    setOpen(false);
    setQ('');
    router.push(r.href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results[active]) openResult(results[active]);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
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

      <form ref={boxRef} onSubmit={submit} className="relative hidden max-w-[717px] flex-1 sm:block" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-[22px] size-[22px] -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search users and corporates..."
          aria-label="Search users and corporates"
          aria-expanded={open && !!term}
          className="h-[65px] w-full rounded-card bg-search pr-14 pl-[63px] text-lg outline-none placeholder:text-[#0a0a0a]/50 focus:ring-2 focus:ring-brand/20"
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ('');
              setOpen(false);
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-4 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-white"
          >
            <X className="size-5" />
          </button>
        ) : null}

        {open && term ? (
          <div className="absolute inset-x-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-card border border-line bg-white shadow-xl">
            {results.length ? (
              <ul role="listbox" className="max-h-[420px] overflow-y-auto py-2">
                {results.map((r, i) => (
                  <li key={`${r.kind}-${r.id}`} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => openResult(r)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left',
                        i === active ? 'bg-page' : 'hover:bg-page',
                      )}
                    >
                      {r.kind === 'user' ? (
                        <Avatar letter={r.letter} size={36} />
                      ) : (
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
                          <Building2 className="size-[18px]" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink">{r.title}</span>
                        <span className="block truncate text-[13px] text-muted">{r.sub || (r.kind === 'corporate' ? 'Corporate' : '')}</span>
                      </span>
                      {r.kind === 'user' ? (
                        <StatusBadge status={r.status} />
                      ) : (
                        <span className="rounded-full bg-navy/10 px-2.5 py-1 text-xs font-medium text-navy">Corporate</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-center text-sm text-muted">No users or corporates match “{q.trim()}”.</p>
            )}
          </div>
        ) : null}
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
