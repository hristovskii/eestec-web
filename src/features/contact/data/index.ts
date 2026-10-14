import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockContactRepository } from './contact.mock';
import type { ContactRepository } from './contact.repository';
import { createMockMessagesRepository } from './messages.mock';
import type { MessagesRepository } from './messages.repository';

/** Public reads are cookie-less; admin writes check permissions in their actions. */
export const contactRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<ContactRepository>('contact', { mock: createMockContactRepository }, scope);

/** Messages come from anonymous visitors (the form) and are read by the board; actions check who may do what. */
export const messagesRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<MessagesRepository>('contact-messages', { mock: createMockMessagesRepository }, scope);
