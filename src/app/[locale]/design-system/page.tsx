import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DesignSystemPage } from '@/features/devtools';
import { devSurfacesEnabled } from '@/shared/config/flags';

export const metadata: Metadata = { title: 'Design system', robots: { index: false, follow: false } };

// Component lab (docs/ARCHITECTURE.md §5): local dev and Vercel previews, 404 in production.
export default function DesignSystemRoute() {
  if (!devSurfacesEnabled()) notFound();
  return (
    <main id="main">
      <DesignSystemPage />
    </main>
  );
}
