import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anonClient, createTestUser } from '../../../../tests/supabase/harness';
import { describeContactRepository } from './contact.repository.contract';
import { createSupabaseContactRepository } from './contact.supabase';

let editor: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor' });
});
afterAll(async () => {
  await editor.cleanup();
});

describeContactRepository('supabase', () => createSupabaseContactRepository(editor.client(), 'session'));

describe('ContactRepository (supabase, public scope)', () => {
  it('shows the subjects and texts but never where messages go', async () => {
    const contact = await createSupabaseContactRepository(anonClient(), 'public').get();
    expect(contact.subjects.length).toBeGreaterThan(0);
    expect(contact.subjects.every((subject) => subject.routeEmail === '')).toBe(true);
  });
});
