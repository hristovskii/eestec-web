import type { Metadata } from 'next';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { JoinAdmin } from '@/features/join/admin';
import { getJoinForEdit } from '@/features/join/server';

export const metadata: Metadata = { title: 'Join Us' };

async function Join() {
  const session = await requirePermission('view', 'pages');
  const { join, media } = await getJoinForEdit();
  return <JoinAdmin record={join} media={media} canEdit={can(session, 'edit', 'pages')} />;
}

// Reads the session: dynamic, so inside Suspense.
export default function JoinAdminPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Join />
    </Suspense>
  );
}
