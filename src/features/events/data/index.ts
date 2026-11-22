import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockEventsRepository, createMockEventTaxonomyRepository } from './events.mock';
import type {
  EventsAdminRepository,
  EventsPublicRepository,
  EventTaxonomyRepository,
} from './events.repository';
import { createSupabaseEventsRepository, createSupabaseEventTaxonomyRepository } from './events.supabase';

/** Public pages: published and hidden events only. */
export const eventsRepository = () =>
  selectImplementation<EventsPublicRepository>(
    'events',
    { mock: createMockEventsRepository, supabase: withClient(createSupabaseEventsRepository) },
    'public',
  );

/** Admin pages and actions (permissions are checked by the callers). */
export const eventsAdminRepository = () =>
  selectImplementation<EventsAdminRepository>(
    'eventsAdmin',
    { mock: createMockEventsRepository, supabase: withClient(createSupabaseEventsRepository) },
    'session',
  );

/** 'session' (default): the board's screens. 'public': the filter chips of public pages (cookie-less, cacheable). */
export const eventTaxonomyRepository = (scope: RepoScope = 'session') =>
  selectImplementation<EventTaxonomyRepository>(
    'eventTaxonomy',
    { mock: createMockEventTaxonomyRepository, supabase: withClient(createSupabaseEventTaxonomyRepository) },
    scope,
  );
