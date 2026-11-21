import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';

import { createMockMemoriesRepository } from './memories.mock';
import type { MemoriesRepository } from './memories.repository';

/** Public reads need no session; author and admin methods take who is asking (callers check). */
export const memoriesRepository = (scope: RepoScope = 'public') =>
  selectImplementation<MemoriesRepository>('memories', { mock: createMockMemoriesRepository }, scope);
