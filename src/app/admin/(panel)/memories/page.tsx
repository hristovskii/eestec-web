import type { Metadata } from 'next';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { adminMemoriesParamsSchema, MemoriesAdmin } from '@/features/memories/admin';
import { getAdminMemories } from '@/features/memories/server';
import { getAuthorCards } from '@/features/members/server';

export const metadata: Metadata = { title: 'Memories' };

async function Memories({ searchParams }: { searchParams: PageProps<'/admin/memories'>['searchParams'] }) {
  const session = await requirePermission('view', 'memories');
  const params = adminMemoriesParamsSchema.parse(await searchParams);
  const { counts, ...page } = await getAdminMemories({
    q: params.q ?? '',
    status: params.status,
    page: params.page,
    pageSize: params.size,
  });
  const cards = await getAuthorCards(
    'member',
    'en',
    page.items.flatMap((row) => (row.authorId ? [row.authorId] : [])),
  );
  return (
    <MemoriesAdmin
      page={page}
      counts={counts}
      params={params}
      authors={Object.fromEntries(Object.entries(cards).map(([id, card]) => [id, card.name]))}
      canEdit={can(session, 'edit', 'memories')}
      canDelete={can(session, 'delete', 'memories')}
    />
  );
}

// Super admins and editors (D18). Reads the session and the URL: inside Suspense.
export default function MemoriesAdminPage({ searchParams }: PageProps<'/admin/memories'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Memories searchParams={searchParams} />
    </Suspense>
  );
}
