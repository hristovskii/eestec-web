import { afterAll, beforeAll } from 'vitest';

import { createTestUser } from '../../../../tests/supabase/harness';
import { describeCommitteesRepository } from './committees.repository.contract';
import { createSupabaseCommitteesRepository } from './committees.supabase';

let editor: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor' });
});
afterAll(async () => {
  await editor.cleanup();
});

describeCommitteesRepository('supabase', () => createSupabaseCommitteesRepository(editor.client()));
