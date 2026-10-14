import type { Metadata } from 'next';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { JourneyAdmin } from '@/features/journey/admin';
import { getJourneyForEdit } from '@/features/journey/server';

export const metadata: Metadata = { title: 'EESTEC Journey' };

async function Journey() {
  const session = await requirePermission('view', 'pages');
  const { journey, media } = await getJourneyForEdit();
  return <JourneyAdmin record={journey} media={media} canEdit={can(session, 'edit', 'pages')} />;
}

// Reads the session: dynamic, so inside Suspense.
export default function JourneyAdminPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Journey />
    </Suspense>
  );
}
