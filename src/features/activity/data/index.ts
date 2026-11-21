import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockActivityRepository } from './activity.mock';
import type { ActivityRepository } from './activity.repository';
import { createSupabaseActivityRepository } from './activity.supabase';

export const activityRepository = () =>
  selectImplementation<ActivityRepository>(
    'activity',
    { mock: createMockActivityRepository, supabase: withClient(createSupabaseActivityRepository) },
    'session',
  );
