import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { ActivityFeed } from '@/features/activity/admin';
import { recentActivity } from '@/features/activity/server';
import { accessTo, can } from '@/features/auth';
import { requirePermission } from '@/features/auth/server';
import { AdminDashboard } from '@/features/dashboard/admin';
import { getDashboard } from '@/features/dashboard/server';
import { getSiteSettings } from '@/features/settings/server';
import { isEnabled } from '@/shared/config/flags';
import { now } from '@/shared/lib/now';
import { Notice } from '@/shared/ui/notice';

export const metadata: Metadata = { title: 'Dashboard' };

async function Dashboard({ searchParams }: { searchParams: Promise<{ forbidden?: string }> }) {
  const session = await requirePermission('view', 'dashboard');
  const showActivity = can(session, 'view', 'activityLog');
  const [data, settings, t, tDays, params, activity] = await Promise.all([
    getDashboard(session),
    getSiteSettings('en'),
    getTranslations('admin.dashboard'),
    getTranslations('admin.weekdays'),
    searchParams,
    showActivity ? recentActivity(6) : Promise.resolve([]),
  ]);
  const nowIso = now().toISOString();
  const phase2 = isEnabled('phase2');

  return (
    <>
      {params.forbidden && (
        <div className="mx-auto max-w-[1240px] px-4 pt-6 md:px-6 xl:px-8">
          <Notice tone="urgent" role="alert" title={t('forbiddenTitle')}>
            {t('forbiddenText')}
          </Notice>
        </div>
      )}
      <AdminDashboard
        data={data}
        firstName={session.name.split(' ')[0] ?? session.name}
        now={nowIso}
        activity={activity.length > 0 ? <ActivityFeed entries={activity} now={nowIso} /> : undefined}
        meetingDay={tDays(settings.weeklyMeeting.day)}
        access={{
          approvals: phase2 && accessTo(session, 'approvals') === 'full',
          inbox: accessTo(session, 'inbox') === 'full',
          ideas: phase2 && accessTo(session, 'ideas') === 'full',
          createEvent: can(session, 'create', 'events'),
          pages: accessTo(session, 'pages') === 'full',
          activityLog: showActivity,
        }}
      />
    </>
  );
}

export default function AdminDashboardPage(props: PageProps<'/admin'>) {
  return (
    <Suspense fallback={<div className="p-8" aria-busy="true" />}>
      <Dashboard searchParams={props.searchParams} />
    </Suspense>
  );
}
