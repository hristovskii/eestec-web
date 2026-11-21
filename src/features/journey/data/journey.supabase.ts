import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import { readPageContent, writePageContent } from '@/shared/data/supabase/page-content';

import type { JourneyRecord } from '../types';
import type { JourneyRepository } from './journey.repository';

/** The page is one `page_content` row (M19b); staff write it, everyone reads it. */
export function createSupabaseJourneyRepository(client: DbClient): JourneyRepository {
  return {
    get: () => readPageContent<JourneyRecord>(client, 'journey'),
    save(input) {
      return writePageContent<JourneyRecord>(client, 'journey', input);
    },
  };
}
