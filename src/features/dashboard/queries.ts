import 'server-only';

import { listApplicationOverview } from '@/features/applications/server';
import { accessTo, type Actor } from '@/features/auth';
import { isEnabled } from '@/shared/config/flags';

import { dashboardRepository } from './data';
import type { AdminBadgeCounts, DashboardData, OpenEventApplications } from './types';

/** Dashboard for this admin: event managers see their own events only (D18). Dynamic (session). */
export async function getDashboard(actor: Actor): Promise<DashboardData> {
  const own = accessTo(actor, 'dashboard') === 'own';
  const [summary, applications] = await Promise.all([
    (await dashboardRepository()).getDashboard({ own }),
    listApplicationOverview(actor),
  ]);
  // "Applications for open events": events whose form takes applications on the site right now
  // (drafts are not on the site).
  const openEvents = applications
    .filter((event) => event.apply.canApply && event.status !== 'draft')
    .map((event): OpenEventApplications => ({
      eventId: event.id,
      title: event.title,
      deadline: event.apply.closesAt,
      total: event.summary?.total ?? 0,
      newCount: event.summary?.newCount ?? 0,
      maxParticipants: event.applicationSettings.maxParticipants ?? 0,
      status:
        event.apply.phase === 'full_waitlist'
          ? 'waitlist'
          : event.apply.phase === 'deadline_soon'
            ? 'deadline_soon'
            : 'open',
    }));
  return {
    ...summary,
    counters: {
      ...summary.counters,
      openEventApplications: {
        total: openEvents.reduce((sum, row) => sum + row.total, 0),
        newCount: openEvents.reduce((sum, row) => sum + row.newCount, 0),
        events: openEvents.length,
      },
    },
    openEvents,
  };
}

/** Red counts in the sidebar: only areas this admin can open; Phase 2 areas only when enabled. */
export function badgeCounts(actor: Actor, data: DashboardData): AdminBadgeCounts {
  const c = data.counters;
  const phase2 = isEnabled('phase2');
  return {
    approvals:
      phase2 && accessTo(actor, 'approvals') !== 'none'
        ? c.memberRegistrations.count + c.memoriesToApprove.count
        : 0,
    inbox:
      accessTo(actor, 'inbox') !== 'none'
        ? c.membershipApplications.count + c.messages.contact + c.messages.partners
        : 0,
    ideas: phase2 && accessTo(actor, 'ideas') === 'full' ? c.ideas.newIdeas + c.ideas.newFeedback : 0,
  };
}
