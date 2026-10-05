import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockActivityRepository } from './activity.mock';
import type { ActivityRepository } from './activity.repository';

export const activityRepository = () =>
  selectImplementation<ActivityRepository>('activity', { mock: createMockActivityRepository }, 'session');
