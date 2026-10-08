import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getFormLink } from '@/features/applications/server';
import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { EventEditForm } from '@/features/events/admin';
import { getEventEditor } from '@/features/events/server';
import { now } from '@/shared/lib/now';

export const metadata: Metadata = { title: 'Edit event' };

async function EditEvent({ params }: { params: PageProps<'/admin/events/[id]'>['params'] }) {
  const { id } = await params;
  // Event managers: only the events they manage (D18).
  const session = await requirePermission('edit', 'events', { eventId: id });
  const editor = await getEventEditor(id);
  if (!editor) notFound();
  const applicationForm = await getFormLink(session, id);
  return (
    <EventEditForm
      // A different event (e.g. after Duplicate) starts with fresh form state.
      key={id}
      {...editor}
      canDelete={can(session, 'delete', 'events', { eventId: id })}
      canAddTopics={can(session, 'edit', 'eventTypes')}
      applicationForm={applicationForm}
      now={now().toISOString()}
    />
  );
}

// Reads the session and the URL: dynamic, so inside Suspense.
export default function EditEventPage({ params }: PageProps<'/admin/events/[id]'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <EditEvent params={params} />
    </Suspense>
  );
}
