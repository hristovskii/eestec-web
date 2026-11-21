import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';

import { createMockJoinRepository } from './join.mock';
import type { JoinRepository } from './join.repository';
import { createMockMembershipRepository } from './membership.mock';
import type { MembershipRepository } from './membership.repository';

/** Public reads are cookie-less; admin writes check permissions in their actions. */
export const joinRepository = (scope: RepoScope = 'public') =>
  selectImplementation<JoinRepository>('join', { mock: createMockJoinRepository }, scope);

/** Applications come from anonymous visitors (the form) and are read by the board; actions check who may do what. */
export const membershipRepository = (scope: RepoScope = 'public') =>
  selectImplementation<MembershipRepository>('membership', { mock: createMockMembershipRepository }, scope);
