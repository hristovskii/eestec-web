import type { Metadata } from 'next';
import { Suspense } from 'react';

import { requirePermission } from '@/features/auth/server';
import { EventTaxonomyEditor } from '@/features/events/admin';
import { listEventTaxonomy } from '@/features/events/server';

export const metadata: Metadata = { title: 'Event types & topics' };

async function Taxonomy() {
  await requirePermission('edit', 'eventTypes');
  const { types, topics } = await listEventTaxonomy();
  return <EventTaxonomyEditor types={types} topics={topics} />;
}

// Super admins and editors (D18). Reads the session: dynamic, so inside Suspense.
export default function EventTypesPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Taxonomy />
    </Suspense>
  );
}
