import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockJourneyRepository } from './journey.mock';
import type { JourneyRepository } from './journey.repository';

/** Public reads are cookie-less; admin writes check permissions in their actions. */
export const journeyRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<JourneyRepository>('journey', { mock: createMockJourneyRepository }, scope);
