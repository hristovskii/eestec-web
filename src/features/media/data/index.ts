import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockMediaRepository } from './media.mock';
import { createSupabaseMediaRepository } from './media.supabase';
import type { MediaRepository } from './media.repository';

/**
 * 'session' (default): the Media library and admin screens. 'public': what public pages need (cookie-less, so it can be
 * used inside `use cache`): the files of published content.
 */
export const mediaRepository = (scope: RepoScope = 'session') =>
  selectImplementation<MediaRepository>(
    'media',
    { mock: createMockMediaRepository, supabase: withClient(createSupabaseMediaRepository) },
    scope,
  );
