import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import { readPageContent, writePageContent } from '@/shared/data/supabase/page-content';

import type { JoinRecord } from '../types';
import type { JoinRepository } from './join.repository';

/** The page is one `page_content` row (M19b); staff write it, everyone reads it. */
export function createSupabaseJoinRepository(client: DbClient): JoinRepository {
  return {
    get: () => readPageContent<JoinRecord>(client, 'join'),
    save(input) {
      return writePageContent<JoinRecord>(client, 'join', input);
    },
  };
}
