import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ActivityFeed } from '@/features/activity/admin';
import { recentActivity } from '@/features/activity/server';
import { LOCKOUT } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { SettingsForm } from '@/features/settings/admin';
import { getSettingsForEdit } from '@/features/settings/server';
import { isEnabled } from '@/shared/config/flags';
import { now } from '@/shared/lib/now';

export const metadata: Metadata = { title: 'Settings' };

async function Settings() {
  await requirePermission('edit', 'settings');
  const [record, activity] = await Promise.all([getSettingsForEdit(), recentActivity(5)]);
  return (
    <SettingsForm
      record={record}
      phase2={isEnabled('phase2')}
      lockout={LOCKOUT}
      activity={<ActivityFeed entries={activity} now={now().toISOString()} />}
    />
  );
}

// Super admins only (D18). Reads the session: dynamic, so inside Suspense.
export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Settings />
    </Suspense>
  );
}
