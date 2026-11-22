import 'server-only';

import { deleteApplicationsOf } from '@/features/applications/server';
import { deleteMemberAccount, deleteMemberPhoto } from '@/features/auth/server';
import { retireMemoriesOf } from '@/features/memories/server';

import type { AccountDeletion } from './account-deletion';
import { createMockMembersRepository } from './members.mock';

/** The steps one by one, each through the part that owns the data (the mock tables are shared). */
export function createMockAccountDeletion(): AccountDeletion {
  return {
    async deleteAccount({ userId, email, alsoDeleteMemories }) {
      const { photoUrl } = await createMockMembersRepository().deleteMine(userId);
      deleteMemberPhoto(photoUrl);
      await deleteApplicationsOf(email);
      await retireMemoriesOf(userId, alsoDeleteMemories);
      return deleteMemberAccount(userId);
    },
  };
}
