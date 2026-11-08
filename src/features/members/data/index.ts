import 'server-only';

import { listApprovedMemberIdentities } from '@/features/auth/server';
import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockMembersRepository } from './members.mock';
import type { MembersRepository } from './members.repository';

/** Public reads take the audience as an argument; admin writes check permissions in their actions. */
export const membersRepository = (scope: 'public' | 'session' = 'public') =>
  selectImplementation<MembersRepository>(
    'members',
    { mock: () => createMockMembersRepository(listApprovedMemberIdentities) },
    scope,
  );
