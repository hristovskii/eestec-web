import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';

import { createMockJourneyRepository } from './journey.mock';
import type { JourneyRepository } from './journey.repository';

/** Public reads are cookie-less; admin writes check permissions in their actions. */
export const journeyRepository = (scope: RepoScope = 'public') =>
  selectImplementation<JourneyRepository>('journey', { mock: createMockJourneyRepository }, scope);
