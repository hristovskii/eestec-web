import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockCommitteesRepository } from './committees.mock';
import { createSupabaseCommitteesRepository } from './committees.supabase';
import type { CommitteesRepository } from './committees.repository';

/** Public reads (the map) are cookie-less; admin writes check permissions in their actions. */
export const committeesRepository = (scope: RepoScope = 'public') =>
  selectImplementation<CommitteesRepository>(
    'committees',
    { mock: createMockCommitteesRepository, supabase: withClient(createSupabaseCommitteesRepository) },
    scope,
  );
