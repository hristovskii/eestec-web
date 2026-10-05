import type { Metadata } from 'next';
import { Suspense } from 'react';

import { accessTo, can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { mediaListParamsSchema } from '@/features/media';
import { MediaLibrary } from '@/features/media/admin';
import { listMedia } from '@/features/media/server';

export const metadata: Metadata = { title: 'Media library' };

async function Library({ searchParams }: { searchParams: PageProps<'/admin/media'>['searchParams'] }) {
  const session = await requirePermission('view', 'media');
  const params = mediaListParamsSchema.parse(await searchParams);
  const page = await listMedia(session, params);
  return (
    <MediaLibrary
      page={page}
      params={params}
      currentUserId={session.userId}
      access={accessTo(session, 'media') === 'own' ? 'own' : 'full'}
      canUpload={can(session, 'create', 'media')}
    />
  );
}

// Reads the session and the URL (filters, page): dynamic, so inside Suspense.
export default function MediaPage({ searchParams }: PageProps<'/admin/media'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Library searchParams={searchParams} />
    </Suspense>
  );
}
