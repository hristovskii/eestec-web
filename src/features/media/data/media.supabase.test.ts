import { afterAll, beforeAll } from 'vitest';

import { createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import { describeMediaRepository } from './media.repository.contract';
import { createSupabaseMediaRepository } from './media.supabase';

let editor: Awaited<ReturnType<typeof createTestUser>>;
let stranger: Awaited<ReturnType<typeof createTestUser>>;
let otherUploader = '';

beforeAll(async () => {
  editor = await createTestUser({ role: 'editor', name: 'Contract Editor' });
  stranger = await createTestUser({ role: 'editor' });
  // Somebody else who already has files in the seeded library.
  const { data } = await serviceClient()
    .from('media')
    .select('uploaded_by')
    .not('uploaded_by', 'is', null)
    .limit(1);
  otherUploader = data?.[0]?.uploaded_by ?? '';
});
afterAll(async () => {
  await editor.cleanup();
  await stranger.cleanup();
});

describeMediaRepository(
  'supabase',
  () => createSupabaseMediaRepository(editor.client()),
  async ({ uploadUrl, mimeType, bytes }) => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': mimeType },
      body: bytes as BodyInit,
    });
    if (!response.ok) throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
  },
  () => ({
    uploader: { userId: editor.id, name: 'Contract Editor' },
    other: { userId: otherUploader },
    stranger: stranger.id,
  }),
);
