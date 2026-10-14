import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockJoinRepository } from './join.mock';
import type { JoinRepository } from './join.repository';

/** Public reads are cookie-less; admin writes check permissions in their actions. */
export const joinRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<JoinRepository>('join', { mock: createMockJoinRepository }, scope);
