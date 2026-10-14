import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockInquiriesRepository } from './inquiries.mock';
import type { InquiriesRepository } from './inquiries.repository';
import { createMockPartnersRepository } from './partners.mock';
import type { PartnersRepository } from './partners.repository';

/** Public reads are cookie-less; admin writes check permissions in their actions. */
export const partnersRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<PartnersRepository>('partners', { mock: createMockPartnersRepository }, scope);

/** Inquiries come from anonymous visitors (the form) and are read by the board; actions check who may do what. */
export const inquiriesRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<InquiriesRepository>(
    'partner-inquiries',
    { mock: createMockInquiriesRepository },
    scope,
  );
