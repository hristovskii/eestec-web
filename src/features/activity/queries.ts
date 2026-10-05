import 'server-only';

import { now } from '@/shared/lib/now';

import { activityRepository } from './data';
import type { ActivityParams } from './schemas/activity-params.schema';
import type { ActivityActor, ActivityEntry } from './types';

/** /admin/activity (super admins; editors read-only, D18). Callers check the permission. */
export async function listActivity(params: ActivityParams) {
  const repo = await activityRepository();
  return repo.list({ area: params.area, actorId: params.person, page: params.page, pageSize: params.size });
}

/** The newest entries (dashboard, Settings › Activity log). */
export async function recentActivity(limit = 6): Promise<ActivityEntry[]> {
  const repo = await activityRepository();
  return (await repo.list({ page: 1, pageSize: limit })).items;
}

/**
 * Log a change made in the admin. Other features' Server Actions call this after a successful
 * write (mock data); in the backend phase database triggers write the log instead.
 */
export async function recordActivity(
  actor: ActivityActor,
  entry: Pick<ActivityEntry, 'action' | 'area' | 'target' | 'href'>,
): Promise<void> {
  const repo = await activityRepository();
  await repo.record({
    ...entry,
    at: now().toISOString(),
    actor: { userId: actor.userId, name: actor.name, initials: actor.initials },
  });
}
