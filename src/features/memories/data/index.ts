import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockMemoriesRepository } from './memories.mock';
import type { MemoriesRepository } from './memories.repository';

/** Public reads need no session; author and admin methods take who is asking (callers check). */
export const memoriesRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<MemoriesRepository>('memories', { mock: createMockMemoriesRepository }, scope);
