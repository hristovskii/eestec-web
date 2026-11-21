import 'server-only';

import { pageWindow } from '@/shared/data/paged';
import type { DbClient } from '@/shared/data/supabase/clients';
import type { Tables } from '@/shared/data/supabase/database.types';
import { unwrap } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { isoOf } from '@/shared/data/supabase/time';
import { initials } from '@/shared/lib/initials';

import { writtenByTrigger } from '../domain/trigger-covered';
import type { ActivityAction, ActivityActor, ActivityArea, ActivityEntry } from '../types';
import type { ActivityRepository } from './activity.repository';

type Row = Tables<'activity_log'>;

const toEntry = (row: Row): ActivityEntry => ({
  id: row.id,
  at: isoOf(row.created_at),
  // Entries of a person whose account is gone, and the system's own, have no actor.
  actor: row.actor
    ? {
        userId: row.actor,
        name: row.actor_name ?? '',
        initials: row.actor_initials ?? initials(row.actor_name ?? ''),
      }
    : null,
  action: row.action as ActivityAction,
  area: row.area as ActivityArea,
  target: row.target,
  ...(row.href ? { href: row.href } : {}),
});

/**
 * The activity log is written by database triggers (events, inbox items) and by `record_activity` (everything the
 * triggers cannot see); the person and the time are the signed-in session and the database clock, so `record`
 * ignores the actor and `at` it is given. Only staff can read the log (row-level security).
 */
export function createSupabaseActivityRepository(client: DbClient): ActivityRepository {
  return {
    async list({ area, actorId, page, pageSize }) {
      const actors = unwrap(await client.rpc('activity_actors'))
        .map((row): ActivityActor => ({
          userId: row.user_id,
          name: row.name,
          initials: row.initials ?? initials(row.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // A made-up person id matches nobody.
      if (actorId && !isUuid(actorId))
        return { items: [], total: 0, page: 1, pageSize, pageCount: 1, actors };

      const filter = <T extends { eq: (column: string, value: string) => T }>(request: T): T => {
        let next = request;
        if (area) next = next.eq('area', area);
        if (actorId) next = next.eq('actor', actorId);
        return next;
      };
      const counted = await filter(client.from('activity_log').select('id', { count: 'exact', head: true }));
      if (counted.error) unwrap(counted);
      const total = counted.count ?? 0;
      const window = pageWindow(total, page, pageSize);
      const rows = unwrap(
        await filter(client.from('activity_log').select('*'))
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(window.from, window.to),
      );
      return {
        items: rows.map(toEntry),
        total,
        page: window.page,
        pageSize,
        pageCount: window.pageCount,
        actors,
      };
    },

    async record(entry) {
      if (writtenByTrigger(entry)) return;
      unwrap(
        await client.rpc('record_activity', {
          p_action: entry.action,
          p_area: entry.area,
          p_target: entry.target,
          ...(entry.href ? { p_href: entry.href } : {}),
        }),
      );
    },
  };
}
