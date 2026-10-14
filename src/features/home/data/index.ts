import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockHomeRepository } from './home.mock';
import type { HomeRepository } from './home.repository';

/** Public reads are cookie-less; admin writes check permissions in their actions. */
export const homeRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<HomeRepository>('home', { mock: createMockHomeRepository }, scope);
