import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockContactRepository } from './contact.mock';
import type { ContactRepository } from './contact.repository';

/** Public reads are cookie-less; admin writes check permissions in their actions. */
export const contactRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<ContactRepository>('contact', { mock: createMockContactRepository }, scope);
