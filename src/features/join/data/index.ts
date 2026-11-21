import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockJoinRepository } from './join.mock';
import { createSupabaseJoinRepository } from './join.supabase';
import type { JoinRepository } from './join.repository';
import { createMockMembershipRepository } from './membership.mock';
import type { MembershipRepository } from './membership.repository';
import { createSupabaseMembershipRepository } from './membership.supabase';

/** Public reads are cookie-less; admin writes check permissions in their actions. */
export const joinRepository = (scope: RepoScope = 'public') =>
  selectImplementation<JoinRepository>(
    'join',
    { mock: createMockJoinRepository, supabase: withClient(createSupabaseJoinRepository) },
    scope,
  );

/**
 * The form stores an application with the service scope (after the spam, validation and consent checks, D32); the
 * board reads and changes applications with the session scope. Actions check who may do what.
 */
export const membershipRepository = (scope: RepoScope = 'session') =>
  selectImplementation<MembershipRepository>(
    'membership',
    { mock: createMockMembershipRepository, supabase: withClient(createSupabaseMembershipRepository) },
    scope,
  );
