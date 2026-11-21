import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockHomeRepository } from './home.mock';
import { createSupabaseHomeRepository } from './home.supabase';
import type { HomeRepository } from './home.repository';

/** Public reads are cookie-less; admin writes check permissions in their actions. */
export const homeRepository = (scope: RepoScope = 'public') =>
  selectImplementation<HomeRepository>(
    'home',
    { mock: createMockHomeRepository, supabase: withClient(createSupabaseHomeRepository) },
    scope,
  );
