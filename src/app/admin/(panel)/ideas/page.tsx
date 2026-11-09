import type { Metadata } from 'next';
import { Suspense } from 'react';

import { requirePermission } from '@/features/auth/server';
import { adminIdeasParamsSchema, IdeasAdmin } from '@/features/ideas/admin';
import { getSettingsForEdit } from '@/features/settings/server';

export const metadata: Metadata = { title: 'Ideas & Feedback' };

async function Ideas({ searchParams }: { searchParams: PageProps<'/admin/ideas'>['searchParams'] }) {
  const session = await requirePermission('view', 'ideas');
  const params = adminIdeasParamsSchema.parse(await searchParams);
  const { notifications } = await getSettingsForEdit();
  return (
    <IdeasAdmin params={params} actor={session} notifyEnabled={notifications.ideasAndFeedback.enabled} />
  );
}

// Super admins and editors handle everything; event managers read the feedback and ratings of
// their own events (D18). Reads the session and the URL: inside Suspense.
export default function IdeasAdminPage({ searchParams }: PageProps<'/admin/ideas'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Ideas searchParams={searchParams} />
    </Suspense>
  );
}
