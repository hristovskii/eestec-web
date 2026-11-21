import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockContactRepository } from './contact.mock';
import { createSupabaseContactRepository } from './contact.supabase';
import type { ContactRepository } from './contact.repository';
import { createMockMessagesRepository } from './messages.mock';
import type { MessagesRepository } from './messages.repository';

/**
 * Public reads are cookie-less and never carry a subject's route e-mail (it is '' there); the admin editor
 * reads it with the session scope and the submit action with the service scope. Writes check permissions in their actions.
 */
export const contactRepository = (scope: RepoScope = 'public') =>
  selectImplementation<ContactRepository>(
    'contact',
    { mock: createMockContactRepository, supabase: withClient(createSupabaseContactRepository) },
    scope,
  );

/** Messages come from anonymous visitors (the form) and are read by the board; actions check who may do what. */
export const messagesRepository = (scope: RepoScope = 'public') =>
  selectImplementation<MessagesRepository>('contact-messages', { mock: createMockMessagesRepository }, scope);
