import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockMemoriesRepository } from './memories.mock';
import type { MemoriesRepository } from './memories.repository';
import { createSupabaseMemoriesRepository } from './memories.supabase';

/** Public reads need no session; author and admin methods take who is asking (callers check). */
export const memoriesRepository = (scope: RepoScope = 'public') =>
  selectImplementation<MemoriesRepository>(
    'memories',
    { mock: createMockMemoriesRepository, supabase: withClient(createSupabaseMemoriesRepository) },
    scope,
  );
