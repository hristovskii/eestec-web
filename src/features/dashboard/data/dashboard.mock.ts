import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import type { DashboardRepository } from './dashboard.repository';
import { dashboardFixture } from './fixtures/dashboard';

export function createMockDashboardRepository(): DashboardRepository {
  const table = mockTable('dashboard', () => dashboardFixture);
  return {
    getDashboard({ own }) {
      return Promise.resolve(own ? { ...table, pending: [] } : table);
    },
  };
}
