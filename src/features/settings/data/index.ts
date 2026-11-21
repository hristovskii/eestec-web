import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockSettingsRepository } from './settings.mock';
import type { SettingsRepository } from './settings.repository';
import { createSupabaseSettingsRepository } from './settings.supabase';

/** Public reads are cookie-less; the Settings page and the privacy editor use the session scope. */
export const settingsRepository = (scope: RepoScope = 'public') =>
  selectImplementation<SettingsRepository>(
    'settings',
    { mock: createMockSettingsRepository, supabase: withClient(createSupabaseSettingsRepository) },
    scope,
  );
