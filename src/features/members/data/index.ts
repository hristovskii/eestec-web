import 'server-only';

import { listApprovedMemberIdentities } from '@/features/auth/server';
import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import type { AccountDeletion } from './account-deletion';
import { createMockAccountDeletion } from './account-deletion.mock';
import { createSupabaseAccountDeletion } from './account-deletion.supabase';
import { createMockMembersRepository } from './members.mock';
import type { MembersRepository } from './members.repository';
import { createSupabaseMembersRepository } from './members.supabase';

/**
 * Public reads take the audience as an argument and apply the visibility rule themselves; on a database the client
 * decides what exists for the reader, so callers use the public scope for visitors and the session scope for
 * members (see `scopeFor` in queries.ts). Admin writes check permissions in their actions.
 */
export const membersRepository = (scope: RepoScope = 'public') =>
  selectImplementation<MembersRepository>(
    'members',
    {
      mock: () => createMockMembersRepository(listApprovedMemberIdentities),
      supabase: withClient(createSupabaseMembersRepository),
    },
    scope,
  );

/**
 * Deleting an account (service scope, D32): called from the Server Action after the password was checked. On a database
 * it is the durable job of 0010; on mock data the steps run through each part's own repository.
 */
export const accountDeletion = () =>
  selectImplementation<AccountDeletion>(
    'account-deletion',
    { mock: createMockAccountDeletion, supabase: withClient(createSupabaseAccountDeletion) },
    'service',
  );
