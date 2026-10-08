import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockCommitteesRepository } from './committees.mock';
import type { CommitteesRepository } from './committees.repository';

/** Public reads (the map) are cookie-less; admin writes check permissions in their actions. */
export const committeesRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<CommitteesRepository>('committees', { mock: createMockCommitteesRepository }, scope);
