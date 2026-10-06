import { describe, expect, it } from 'vitest';

import type { DashboardRepository } from './dashboard.repository';

export function describeDashboardRepository(
  name: string,
  create: () => DashboardRepository | Promise<DashboardRepository>,
) {
  describe(`DashboardRepository (${name})`, () => {
    it('returns the counters and pending approvals for editors and super admins', async () => {
      const data = await (await create()).getDashboard({ own: false });
      expect(data.pending.length).toBeGreaterThan(0);
      expect(data.counters.membershipApplications.count).toBeGreaterThanOrEqual(0);
    });

    it('hides approvals from event managers', async () => {
      const own = await (await create()).getDashboard({ own: true });
      expect(own.pending).toEqual([]);
    });
  });
}
