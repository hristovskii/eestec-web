import { createMockMembershipRepository } from './membership.mock';
import { describeMembershipRepository } from './membership.repository.contract';

describeMembershipRepository('mock', createMockMembershipRepository);
