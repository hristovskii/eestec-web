import type { Metadata } from 'next';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { HomeAdmin } from '@/features/home/admin';
import { getHomeForEdit } from '@/features/home/server';

export const metadata: Metadata = { title: 'Home page' };

async function Home() {
  const session = await requirePermission('view', 'pages');
  const { home, media } = await getHomeForEdit();
  return <HomeAdmin record={home} media={media} canEdit={can(session, 'edit', 'pages')} />;
}

// Reads the session: dynamic, so inside Suspense.
export default function HomeAdminPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Home />
    </Suspense>
  );
}
