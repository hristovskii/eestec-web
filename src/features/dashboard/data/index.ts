import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import type { DashboardRepository } from './dashboard.repository';
import { createMockDashboardRepository } from './dashboard.mock';

export const dashboardRepository = () =>
  selectImplementation<DashboardRepository>('dashboard', { mock: createMockDashboardRepository }, 'session');
