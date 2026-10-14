import type { Metadata } from 'next';
import { Suspense } from 'react';

import { can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { ContactAdmin } from '@/features/contact/admin';
import { getContactForEdit } from '@/features/contact/server';

export const metadata: Metadata = { title: 'Contact' };

async function Contact() {
  const session = await requirePermission('view', 'pages');
  const { contact } = await getContactForEdit();
  return <ContactAdmin record={contact} canEdit={can(session, 'edit', 'pages')} />;
}

// Reads the session: dynamic, so inside Suspense.
export default function ContactAdminPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Contact />
    </Suspense>
  );
}
