import { afterAll, beforeAll } from 'vitest';

import { createTestUser } from '../../../../tests/supabase/harness';
import { createSupabaseHomeRepository } from './home.supabase';
import { describeHomeRepository } from './home.repository.contract';

let editor: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor' });
});
afterAll(async () => {
  await editor.cleanup();
});

describeHomeRepository('supabase', () => createSupabaseHomeRepository(editor.client()));
