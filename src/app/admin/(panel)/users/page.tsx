import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AdminUsersPage, PermissionsMatrix } from '@/features/admin-users/admin';
import { listAdminAccounts, requirePermission } from '@/features/auth/server';
import { listEventOptions } from '@/features/events/server';
import { now } from '@/shared/lib/now';

export const metadata: Metadata = { title: 'Admin users' };

async function Users() {
  const session = await requirePermission('edit', 'adminUsers');
  const [admins, events] = await Promise.all([listAdminAccounts(), listEventOptions()]);
  return (
    <AdminUsersPage
      admins={admins}
      events={events}
      currentUserId={session.userId}
      now={now().toISOString()}
      matrix={<PermissionsMatrix />}
    />
  );
}

// Super admins only (D18). Reads the session: dynamic, so inside Suspense.
export default function AdminUsersRoute() {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Users />
    </Suspense>
  );
}
