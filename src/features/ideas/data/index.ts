import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockIdeaFormRepository } from './form.mock';
import type { IdeaFormRepository } from './form.repository';
import { createMockSubmissionsRepository } from './submissions.mock';
import type { SubmissionsRepository } from './submissions.repository';

/** The page's texts and idea types: public reads, admin writes (actions check permissions). */
export const ideaFormRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<IdeaFormRepository>('idea-form', { mock: createMockIdeaFormRepository }, scope);

/** Ideas and feedback come from anyone (the form) and are read by the board; actions check who may do what. */
export const submissionsRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<SubmissionsRepository>(
    'submissions',
    { mock: createMockSubmissionsRepository },
    scope,
  );
