import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockEventsRepository, createMockEventTaxonomyRepository } from './events.mock';
import type { EventsRepository, EventTaxonomyRepository } from './events.repository';

export const eventsRepository = () =>
  selectImplementation<EventsRepository>('events', { mock: createMockEventsRepository }, 'session');

export const eventTaxonomyRepository = () =>
  selectImplementation<EventTaxonomyRepository>(
    'eventTaxonomy',
    { mock: createMockEventTaxonomyRepository },
    'session',
  );
