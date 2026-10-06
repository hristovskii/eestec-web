import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { adminApplicationsParamsSchema } from '@/features/applications';
import { ApplicationsAdmin, EventApplicationsAdmin } from '@/features/applications/admin';
import { getApplicationsOverview, getEventApplications } from '@/features/applications/server';
import { accessTo, can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';

export const metadata: Metadata = { title: 'Applications' };

async function Applications({
  searchParams,
}: {
  searchParams: PageProps<'/admin/applications'>['searchParams'];
}) {
  const session = await requirePermission('view', 'applications');
  const params = adminApplicationsParamsSchema.parse(await searchParams);

  if (params.event) {
    const loaded = await getEventApplications(session, params);
    if (!loaded) notFound();
    const { event } = loaded;
    return (
      <EventApplicationsAdmin
        event={event}
        page={loaded.page}
        params={params}
        fields={loaded.fields}
        opened={loaded.opened}
        canEdit={loaded.canEdit}
        canEditEvent={can(session, 'edit', 'events', { eventId: event.id })}
        publicPath={`/en/${event.timing === 'upcoming' ? 'upcoming' : 'events'}/${event.slug}`}
        acceptedEmails={loaded.acceptedEmails}
      />
    );
  }

  const { rows, counts } = await getApplicationsOverview(session, params.tab);
  return (
    <ApplicationsAdmin
      rows={rows}
      tab={params.tab}
      counts={counts}
      access={accessTo(session, 'applications') === 'own' ? 'own' : 'full'}
    />
  );
}

// Reads the session and the URL (event, status, search, page): dynamic, so inside Suspense.
export default function ApplicationsPage({ searchParams }: PageProps<'/admin/applications'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Applications searchParams={searchParams} />
    </Suspense>
  );
}
