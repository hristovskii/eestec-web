import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockEventsRepository, createMockEventTaxonomyRepository } from './events.mock';
import type {
  EventsAdminRepository,
  EventsPublicRepository,
  EventTaxonomyRepository,
} from './events.repository';

/** Public pages: published and hidden events only. */
export const eventsRepository = () =>
  selectImplementation<EventsPublicRepository>('events', { mock: createMockEventsRepository }, 'public');

/** Admin pages and actions (permissions are checked by the callers). */
export const eventsAdminRepository = () =>
  selectImplementation<EventsAdminRepository>('eventsAdmin', { mock: createMockEventsRepository }, 'session');

export const eventTaxonomyRepository = () =>
  selectImplementation<EventTaxonomyRepository>(
    'eventTaxonomy',
    { mock: createMockEventTaxonomyRepository },
    'session',
  );
