import { describe, expect, it } from 'vitest';

import type { DashboardRepository } from './dashboard.repository';

export function describeDashboardRepository(
  name: string,
  create: () => DashboardRepository | Promise<DashboardRepository>,
) {
  describe(`DashboardRepository (${name})`, () => {
    it('returns everything for editors and super admins', async () => {
      const data = await (await create()).getDashboard({});
      expect(data.openEvents.length).toBeGreaterThan(0);
      expect(data.counters.openEventApplications.events).toBe(data.openEvents.length);
    });

    it('limits event managers to their own events and hides approvals', async () => {
      const repo = await create();
      const all = await repo.getDashboard({});
      const first = all.openEvents[0]!;
      const own = await repo.getDashboard({ eventIds: [first.eventId] });
      expect(own.openEvents.map((row) => row.eventId)).toEqual([first.eventId]);
      expect(own.counters.openEventApplications.total).toBe(first.total);
      expect(own.pending).toEqual([]);
    });
  });
}
