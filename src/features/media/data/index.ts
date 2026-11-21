import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockMediaRepository } from './media.mock';
import { createSupabaseMediaRepository } from './media.supabase';
import type { MediaRepository } from './media.repository';

export const mediaRepository = () =>
  selectImplementation<MediaRepository>(
    'media',
    { mock: createMockMediaRepository, supabase: withClient(createSupabaseMediaRepository) },
    'session',
  );
