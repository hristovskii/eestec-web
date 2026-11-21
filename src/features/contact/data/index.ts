import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockContactRepository } from './contact.mock';
import { createSupabaseContactRepository } from './contact.supabase';
import type { ContactRepository } from './contact.repository';
import { createMockMessagesRepository } from './messages.mock';
import type { MessagesRepository } from './messages.repository';
import { createSupabaseMessagesRepository } from './messages.supabase';

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

/**
 * The form stores a message with the service scope (after the spam, validation and consent checks, D32); the board
 * reads and changes messages with the session scope. Actions check who may do what.
 */
export const messagesRepository = (scope: RepoScope = 'session') =>
  selectImplementation<MessagesRepository>(
    'contact-messages',
    { mock: createMockMessagesRepository, supabase: withClient(createSupabaseMessagesRepository) },
    scope,
  );
