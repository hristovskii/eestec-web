import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockApplicationsRepository } from './applications.mock';
import type { ApplicationsRepository } from './applications.repository';

/** Public reads and submissions (no session needed). */
export const applicationsRepository = () =>
  selectImplementation<ApplicationsRepository>(
    'applications',
    { mock: createMockApplicationsRepository },
    'public',
  );
