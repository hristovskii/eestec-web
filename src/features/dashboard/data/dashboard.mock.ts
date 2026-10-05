import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import type { DashboardRepository } from './dashboard.repository';
import { dashboardFixture } from './fixtures/dashboard';

export function createMockDashboardRepository(): DashboardRepository {
  const table = mockTable('dashboard', () => dashboardFixture);
  return {
    getDashboard({ eventIds }) {
      if (!eventIds) return Promise.resolve(table);
      const openEvents = table.openEvents.filter((row) => eventIds.includes(row.eventId));
      return Promise.resolve({
        ...table,
        openEvents,
        counters: {
          ...table.counters,
          openEventApplications: {
            total: openEvents.reduce((sum, row) => sum + row.total, 0),
            newCount: openEvents.reduce((sum, row) => sum + row.newCount, 0),
            events: openEvents.length,
          },
        },
        pending: [],
      });
    },
  };
}
