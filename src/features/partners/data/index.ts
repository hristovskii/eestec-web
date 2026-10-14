import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockPartnersRepository } from './partners.mock';
import type { PartnersRepository } from './partners.repository';

/** Public reads are cookie-less; admin writes check permissions in their actions. */
export const partnersRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<PartnersRepository>('partners', { mock: createMockPartnersRepository }, scope);
