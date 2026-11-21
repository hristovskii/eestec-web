import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockApplicationsRepository } from './applications.mock';
import type { ApplicationsRepository } from './applications.repository';
import { createSupabaseApplicationsRepository } from './applications.supabase';

/**
 * 'public': the form and the places (cookie-less). 'session': the board and managers (list, status, form
 * builder) and a member's own applications. 'service': saving an application and its files, and the
 * deletions, only after the caller's own checks (D32).
 */
export const applicationsRepository = (scope: RepoScope = 'public') =>
  selectImplementation<ApplicationsRepository>(
    'applications',
    { mock: createMockApplicationsRepository, supabase: withClient(createSupabaseApplicationsRepository) },
    scope,
  );
