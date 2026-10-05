import type { Metadata } from 'next';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { EventEditForm } from '@/features/events/admin';
import { getEventEditor } from '@/features/events/server';
import { now } from '@/shared/lib/now';

export const metadata: Metadata = { title: 'New event' };

async function NewEvent() {
  // Event managers can't create events (D18).
  const session = await requirePermission('create', 'events');
  const editor = (await getEventEditor(null))!;
  return (
    <EventEditForm
      {...editor}
      canDelete={false}
      canAddTopics={can(session, 'edit', 'eventTypes')}
      now={now().toISOString()}
    />
  );
}

// Reads the session: dynamic, so inside Suspense.
export default function NewEventPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <NewEvent />
    </Suspense>
  );
}
