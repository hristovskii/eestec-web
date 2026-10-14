import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import type { JourneyRecord } from '../types';
import { journeyFixture } from './fixtures/journey';
import type { JourneyRepository } from './journey.repository';

const tables = () =>
  mockTable<{ journey: JourneyRecord }>('journey', () => ({ journey: structuredClone(journeyFixture) }));

export function createMockJourneyRepository(): JourneyRepository {
  const db = tables();
  return {
    get() {
      return Promise.resolve(structuredClone(db.journey));
    },
    save(input) {
      db.journey = structuredClone(input);
      return Promise.resolve(structuredClone(db.journey));
    },
  };
}
