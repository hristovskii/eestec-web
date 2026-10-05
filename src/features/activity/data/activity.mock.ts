import 'server-only';

import { paginate } from '@/shared/data/paged';
import { mockTable } from '@/shared/data/mock/store';

import type { ActivityActor, ActivityEntry } from '../types';
import type { ActivityRepository } from './activity.repository';
import { activityFixture } from './fixtures/activity';

export function createMockActivityRepository(): ActivityRepository {
  const table = mockTable<{ entries: ActivityEntry[] }>('activity', () => ({ entries: activityFixture }));

  return {
    list({ area, actorId, page, pageSize }) {
      // Compare times, not strings: entries mix offsets (+02:00) and UTC (Z).
      const sorted = [...table.entries].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      const filtered = sorted.filter(
        (entry) => (!area || entry.area === area) && (!actorId || entry.actor?.userId === actorId),
      );
      const actors = new Map<string, ActivityActor>();
      for (const entry of sorted) if (entry.actor) actors.set(entry.actor.userId, entry.actor);
      return Promise.resolve({
        ...paginate(filtered, page, pageSize),
        actors: [...actors.values()].sort((a, b) => a.name.localeCompare(b.name)),
      });
    },

    record(entry) {
      table.entries.push({ ...entry, id: crypto.randomUUID() });
      return Promise.resolve();
    },
  };
}
