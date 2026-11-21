import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockInquiriesRepository } from './inquiries.mock';
import type { InquiriesRepository } from './inquiries.repository';
import { createSupabaseInquiriesRepository } from './inquiries.supabase';
import { createMockPartnersRepository } from './partners.mock';
import { createSupabasePartnersRepository } from './partners.supabase';
import type { PartnersRepository } from './partners.repository';

/** Public reads are cookie-less; admin writes check permissions in their actions. */
export const partnersRepository = (scope: RepoScope = 'public') =>
  selectImplementation<PartnersRepository>(
    'partners',
    { mock: createMockPartnersRepository, supabase: withClient(createSupabasePartnersRepository) },
    scope,
  );

/**
 * The form stores an inquiry with the service scope (after the spam, validation and consent checks, D32); the board
 * reads and changes inquiries with the session scope. Actions check who may do what.
 */
export const inquiriesRepository = (scope: RepoScope = 'session') =>
  selectImplementation<InquiriesRepository>(
    'partner-inquiries',
    { mock: createMockInquiriesRepository, supabase: withClient(createSupabaseInquiriesRepository) },
    scope,
  );
