import type { Metadata } from 'next';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { adminCommitteesParamsSchema } from '@/features/committees';
import { CommitteesAdmin } from '@/features/committees/admin';
import { listAdminCommittees } from '@/features/committees/server';

export const metadata: Metadata = { title: 'Map / Committees' };

async function Committees({ searchParams }: { searchParams: PageProps<'/admin/pages/map'>['searchParams'] }) {
  const session = await requirePermission('view', 'pages');
  const params = adminCommitteesParamsSchema.parse(await searchParams);
  const { page, totals } = await listAdminCommittees(params);
  return (
    <CommitteesAdmin page={page} params={params} totals={totals} canEdit={can(session, 'edit', 'pages')} />
  );
}

// Reads the session and the URL (filters, page): dynamic, so inside Suspense.
export default function MapAdminPage({ searchParams }: PageProps<'/admin/pages/map'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Committees searchParams={searchParams} />
    </Suspense>
  );
}
