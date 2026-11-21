import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import { readPageContent, writePageContent } from '@/shared/data/supabase/page-content';

import { normalizeLayout } from '../domain/layout';
import type { HomeRecord } from '../types';
import type { HomeRepository } from './home.repository';

/** The page is one `page_content` row (M19b); staff write it, everyone reads it. */
export function createSupabaseHomeRepository(client: DbClient): HomeRepository {
  return {
    get: () => readPageContent<HomeRecord>(client, 'home'),
    save(input) {
      return writePageContent<HomeRecord>(client, 'home', {
        ...input,
        layout: normalizeLayout(input.layout),
      });
    },
  };
}
