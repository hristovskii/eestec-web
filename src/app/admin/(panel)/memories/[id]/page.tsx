import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { MemoryAdminForm } from '@/features/memories/admin';
import { getMemoryForAdmin } from '@/features/memories/server';
import { getAuthorCards } from '@/features/members/server';

export const metadata: Metadata = { title: 'Edit Memory' };

// The board edits any address; a placeholder lets the shell prerender (it 404s).
export function generateStaticParams() {
  return [{ id: '__none__' }];
}

async function Edit({ params }: { params: PageProps<'/admin/memories/[id]'>['params'] }) {
  const [session, { id }] = await Promise.all([requirePermission('view', 'memories'), params]);
  const data = await getMemoryForAdmin(id);
  if (!data) notFound();
  const authors = data.record.authorId ? await getAuthorCards('member', 'en', [data.record.authorId]) : {};
  return (
    <MemoryAdminForm
      key={`${data.record.id}-${data.record.updatedAt}`}
      record={data.record}
      initial={data.editing}
      events={data.events}
      authorName={
        data.record.authorId ? (authors[data.record.authorId]?.name ?? 'A member') : 'A former member'
      }
      canEdit={can(session, 'edit', 'memories')}
    />
  );
}

export default function EditMemoryPage({ params }: PageProps<'/admin/memories/[id]'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Edit params={params} />
    </Suspense>
  );
}
