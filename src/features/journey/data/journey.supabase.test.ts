import { afterAll, beforeAll } from 'vitest';

import { createTestUser } from '../../../../tests/supabase/harness';
import { createSupabaseJourneyRepository } from './journey.supabase';
import { describeJourneyRepository } from './journey.repository.contract';

let editor: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor' });
});
afterAll(async () => {
  await editor.cleanup();
});

describeJourneyRepository('supabase', () => createSupabaseJourneyRepository(editor.client()));
