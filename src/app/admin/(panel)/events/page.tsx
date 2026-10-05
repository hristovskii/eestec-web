import type { Metadata } from 'next';
import { Suspense } from 'react';

import { accessTo, can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { adminEventsParamsSchema } from '@/features/events';
import { EventsAdminList } from '@/features/events/admin';
import { listAdminEvents } from '@/features/events/server';
import { now } from '@/shared/lib/now';

export const metadata: Metadata = { title: 'Events' };

async function Events({ searchParams }: { searchParams: PageProps<'/admin/events'>['searchParams'] }) {
  const session = await requirePermission('view', 'events');
  const params = adminEventsParamsSchema.parse(await searchParams);
  const { page, years, types, covers } = await listAdminEvents(session, params);
  return (
    <EventsAdminList
      page={page}
      params={params}
      years={years}
      types={types}
      covers={covers}
      access={accessTo(session, 'events') === 'own' ? 'own' : 'full'}
      canCreate={can(session, 'create', 'events')}
      canDelete={can(session, 'delete', 'events')}
      canEditTypes={can(session, 'edit', 'eventTypes')}
      now={now().toISOString()}
    />
  );
}

// Reads the session and the URL (filters, page): dynamic, so inside Suspense.
export default function EventsPage({ searchParams }: PageProps<'/admin/events'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Events searchParams={searchParams} />
    </Suspense>
  );
}
