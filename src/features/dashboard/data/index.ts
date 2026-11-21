import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockDashboardRepository } from './dashboard.mock';
import type { DashboardRepository } from './dashboard.repository';
import { createSupabaseDashboardRepository } from './dashboard.supabase';

export const dashboardRepository = () =>
  selectImplementation<DashboardRepository>(
    'dashboard',
    { mock: createMockDashboardRepository, supabase: withClient(createSupabaseDashboardRepository) },
    'session',
  );
