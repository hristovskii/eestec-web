import { afterAll, beforeAll } from 'vitest';

import { createTestUser } from '../../../../tests/supabase/harness';
import { createSupabaseJoinRepository } from './join.supabase';
import { describeJoinRepository } from './join.repository.contract';

let editor: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor' });
});
afterAll(async () => {
  await editor.cleanup();
});

describeJoinRepository('supabase', () => createSupabaseJoinRepository(editor.client()));
