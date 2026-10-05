import type { Metadata } from 'next';
import { Suspense } from 'react';

import { activityParamsSchema } from '@/features/activity';
import { ActivityLog } from '@/features/activity/admin';
import { listActivity } from '@/features/activity/server';
import { requirePermission } from '@/features/auth/server';

export const metadata: Metadata = { title: 'Activity log' };

async function Log({ searchParams }: { searchParams: PageProps<'/admin/activity'>['searchParams'] }) {
  await requirePermission('view', 'activityLog');
  const params = activityParamsSchema.parse(await searchParams);
  return <ActivityLog page={await listActivity(params)} params={params} />;
}

// Super admins and editors (read-only, D18). Reads the session and the URL: inside Suspense.
export default function ActivityPage({ searchParams }: PageProps<'/admin/activity'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Log searchParams={searchParams} />
    </Suspense>
  );
}
