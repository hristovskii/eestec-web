import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockEventsRepository } from './events.mock';
import type { EventsRepository } from './events.repository';

export const eventsRepository = () =>
  selectImplementation<EventsRepository>('events', { mock: createMockEventsRepository }, 'session');
