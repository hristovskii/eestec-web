import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anonClient, createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import type { MembershipInput } from '../types';
import { describeMembershipRepository } from './membership.repository.contract';
import type { MembershipRepository } from './membership.repository';
import { createSupabaseMembershipRepository } from './membership.supabase';

let editor: Awaited<ReturnType<typeof createTestUser>>;
let manager: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor' });
  manager = await createTestUser({ role: 'event_manager' });
});
afterAll(async () => {
  await editor.cleanup();
  await manager.cleanup();
});

/** As in the app: the form stores with the service scope, the board reads and changes with its own session. */
const asApp = (): MembershipRepository => ({
  ...createSupabaseMembershipRepository(editor.client()),
  submit: (input, now) => createSupabaseMembershipRepository(serviceClient()).submit(input, now),
});

const unique = () => crypto.randomUUID().slice(0, 8);
const input = (patch: Partial<MembershipInput> = {}): MembershipInput => ({
  name: 'Test Person',
  email: `test.${unique()}@example.org`,
  phone: '',
  faculty: 'FEEIT',
  studyProgram: 'Testing',
  yearOfStudy: '2',
  interests: ['IT'],
  heardFrom: 'Instagram',
  locale: 'en',
  ...patch,
});

describeMembershipRepository('supabase', asApp);

describe('MembershipRepository (supabase, who may do what)', () => {
  it('stores the choices as given and says "duplicate" for two sent at once', async () => {
    const email = `race.${unique()}@example.org`;
    const results = await Promise.all([
      asApp().submit(input({ email }), new Date()),
      asApp().submit(input({ email }), new Date()),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(['created', 'duplicate']);
  });

  it('is not open to visitors: they cannot store or read applications', async () => {
    const visitor = createSupabaseMembershipRepository(anonClient());
    await expect(visitor.submit(input(), new Date())).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(visitor.list()).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('shows an event manager nothing and lets them change nothing', async () => {
    const stored = await asApp().submit(input(), new Date());
    if (stored.status !== 'created') throw new Error('not created');
    const asManager = createSupabaseMembershipRepository(manager.client());
    expect(await asManager.list()).toEqual([]);
    expect(await asManager.get(stored.application.id)).toBeNull();
    await expect(asManager.updateStatus(stored.application.id, 'accepted')).rejects.toMatchObject({
      kind: 'forbidden',
    });
    await expect(asManager.markAllRead(new Date())).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('keeps an application whose address was erased (null)', async () => {
    const stored = await asApp().submit(input(), new Date());
    if (stored.status !== 'created') throw new Error('not created');
    await serviceClient()
      .from('membership_applications')
      .update({ email: null })
      .eq('id', stored.application.id);
    expect(await asApp().get(stored.application.id)).toMatchObject({ email: null, faculty: 'FEEIT' });
  });
});
