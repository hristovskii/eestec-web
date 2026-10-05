import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { AdminPatternsPage } from '@/features/devtools/admin';
import { devSurfacesEnabled } from '@/shared/config/flags';
import { now } from '@/shared/lib/now';

export const metadata: Metadata = { title: 'Admin patterns' };

async function Lab({ searchParams }: { searchParams: PageProps<'/admin/design-system'>['searchParams'] }) {
  const params = await searchParams;
  // "All changes saved · 4 min ago" on the canvas.
  const savedAt = new Date(now().getTime() - 4 * 60_000).toISOString();
  return <AdminPatternsPage searchParams={params} savedAt={savedAt} />;
}

// Admin patterns lab (docs/ARCHITECTURE.md §5): local dev and Vercel previews, 404 in production.
// Reads searchParams (filters in the URL), so it renders inside Suspense.
export default function AdminDesignSystemRoute({ searchParams }: PageProps<'/admin/design-system'>) {
  if (!devSurfacesEnabled()) notFound();
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Lab searchParams={searchParams} />
    </Suspense>
  );
}
