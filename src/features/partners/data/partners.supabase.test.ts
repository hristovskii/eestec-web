import { afterAll, beforeAll } from 'vitest';

import { createTestUser } from '../../../../tests/supabase/harness';
import { describePartnersRepository } from './partners.repository.contract';
import { createSupabasePartnersRepository } from './partners.supabase';

let editor: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor' });
});
afterAll(async () => {
  await editor.cleanup();
});

describePartnersRepository('supabase', () => createSupabasePartnersRepository(editor.client()));
