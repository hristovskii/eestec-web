import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import type { EventOption } from '../types';
import type { EventsRepository } from './events.repository';
import { eventsFixture } from './fixtures/events';

export function createMockEventsRepository(): EventsRepository {
  const table = mockTable<{ events: EventOption[] }>('events', () => ({ events: eventsFixture }));
  return {
    listOptions() {
      return Promise.resolve(
        [...table.events].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt)),
      );
    },
  };
}
