import 'server-only';

import { createImpressionMemory } from '@/features/memories/server';
import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockIdeaFormRepository } from './form.mock';
import type { IdeaFormRepository } from './form.repository';
import { createSupabaseIdeaFormRepository } from './form.supabase';
import { createMockSubmissionsRepository } from './submissions.mock';
import type { SubmissionsRepository } from './submissions.repository';
import { createSupabaseSubmissionsRepository } from './submissions.supabase';

/** The page's texts and idea types: public reads, admin writes (actions check permissions). */
export const ideaFormRepository = (scope: RepoScope = 'public') =>
  selectImplementation<IdeaFormRepository>(
    'idea-form',
    { mock: createMockIdeaFormRepository, supabase: withClient(createSupabaseIdeaFormRepository) },
    scope,
  );

/**
 * Ideas and feedback come from anyone (the form: server-side, service scope on a database) and are read by the board
 * (session scope); actions check who may do what.
 */
export const submissionsRepository = (scope: RepoScope = 'session') =>
  selectImplementation<SubmissionsRepository>(
    'submissions',
    {
      mock: () => createMockSubmissionsRepository(createImpressionMemory),
      supabase: withClient(createSupabaseSubmissionsRepository),
    },
    scope,
  );
