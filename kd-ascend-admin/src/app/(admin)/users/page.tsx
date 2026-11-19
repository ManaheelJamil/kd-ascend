import type { StatusFilter } from '@/lib/types';
import UsersManagement from './UsersManagement';

const VALID: StatusFilter[] = ['all', 'under_review', 'approved', 'rejected', 'blacklisted', 'incomplete'];

function parseStatus(raw: string | undefined): StatusFilter {
  if (raw && VALID.includes(raw as StatusFilter)) return raw as StatusFilter;
  return 'all';
}

type PageProps = {
  searchParams: Promise<{ status?: string; q?: string }>;
};

/** Server page — reads URL params here so the client tree does not suspend on useSearchParams. */
export default async function UsersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return (
    <UsersManagement initialStatus={parseStatus(sp.status)} initialPendingQ={(sp.q ?? '').trim()} />
  );
}