import 'server-only';

import { accessTo, type Actor } from '@/features/auth';
import { isEnabled } from '@/shared/config/flags';

import { dashboardRepository } from './data';
import type { AdminBadgeCounts, DashboardData } from './types';

/** Dashboard for this admin: event managers see their own events only (D18). Dynamic (session). */
export async function getDashboard(actor: Actor): Promise<DashboardData> {
  const own = accessTo(actor, 'dashboard') === 'own';
  return (await dashboardRepository()).getDashboard(own ? { eventIds: actor.managedEventIds ?? [] } : {});
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
