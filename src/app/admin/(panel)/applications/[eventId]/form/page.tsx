import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { FormBuilder } from '@/features/applications/admin';
import { getFormBuilder } from '@/features/applications/server';
import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';

export const metadata: Metadata = { title: 'Application form' };

async function Builder({ params }: { params: PageProps<'/admin/applications/[eventId]/form'>['params'] }) {
  const { eventId } = await params;
  // Event managers: only the events they manage (D18).
  const session = await requirePermission('view', 'applications', { eventId });
  const builder = await getFormBuilder(session, eventId);
  if (!builder) notFound();
  return (
    <FormBuilder
      // Starts fresh after the first save and after "Back to the default questions".
      key={`${eventId}-${builder.isDefault ? 'default' : 'custom'}`}
      {...builder}
      canEditEvent={can(session, 'edit', 'events', { eventId })}
    />
  );
}

// Reads the session and the URL: dynamic, so inside Suspense.
export default function ApplicationFormPage({ params }: PageProps<'/admin/applications/[eventId]/form'>) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Builder params={params} />
    </Suspense>
  );
}
