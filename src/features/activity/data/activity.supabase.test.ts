import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anonClient, createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import { createSupabaseActivityRepository } from './activity.supabase';
import { describeActivityRepository } from './activity.repository.contract';

let editor: Awaited<ReturnType<typeof createTestUser>>;
let manager: Awaited<ReturnType<typeof createTestUser>>;
let member: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor', name: 'Contract Editor' });
  manager = await createTestUser({ role: 'event_manager', name: 'Contract Manager' });
  member = await createTestUser({ member: 'active' });
});
afterAll(async () => {
  await editor.cleanup();
  await manager.cleanup();
  await member.cleanup();
});

describeActivityRepository('supabase', () => createSupabaseActivityRepository(editor.client()));

const entry = (
  patch: Partial<Parameters<ReturnType<typeof createSupabaseActivityRepository>['record']>[0]> = {},
) => ({
  at: '2020-01-01T00:00:00.000Z',
  actor: { userId: 'ignored', name: 'Ignored', initials: 'IG' },
  action: 'updated' as const,
  area: 'pages' as const,
  target: `Contract ${crypto.randomUUID()}`,
  ...patch,
});

describe('ActivityRepository (supabase, who writes and reads)', () => {
  it('writes under the signed-in person and the database clock, whatever the entry says', async () => {
    const repo = createSupabaseActivityRepository(editor.client());
    const given = entry();
    await repo.record(given);
    const [first] = (await repo.list({ page: 1, pageSize: 1 })).items;
    expect(first).toMatchObject({
      target: given.target,
      actor: { userId: editor.id, name: 'Contract Editor', initials: 'CE' },
    });
    expect(Date.parse(first!.at)).toBeGreaterThan(Date.parse('2026-11-01'));
  });

  it('leaves out what a row trigger already logs (events, inbox status)', async () => {
    const repo = createSupabaseActivityRepository(editor.client());
    const before = (await repo.list({ page: 1, pageSize: 1 })).total;
    await repo.record(entry({ area: 'events', action: 'updated', href: '/admin/events' }));
    await repo.record(entry({ area: 'inbox', action: 'updated', href: '/admin/inbox?tab=contact&open=x' }));
    expect((await repo.list({ page: 1, pageSize: 1 })).total).toBe(before);
    await repo.record(entry({ area: 'events', action: 'created', href: '/admin/events/types' }));
    expect((await repo.list({ page: 1, pageSize: 1 })).total).toBe(before + 1);
  });

  it('lets an event manager log their own areas only', async () => {
    const asManager = createSupabaseActivityRepository(manager.client());
    const target = `Contract ${crypto.randomUUID()}`;
    await asManager.record(entry({ area: 'applications', target }));
    await expect(asManager.record(entry({ area: 'inbox', action: 'exported' }))).rejects.toMatchObject({
      kind: 'forbidden',
    });
    const [first] = (await createSupabaseActivityRepository(editor.client()).list({ page: 1, pageSize: 1 }))
      .items;
    expect(first).toMatchObject({ target, actor: { userId: manager.id } });
  });

  it('is read by staff only', async () => {
    for (const client of [manager.client(), member.client()]) {
      const page = await createSupabaseActivityRepository(client).list({ page: 1, pageSize: 10 });
      expect(page.items).toEqual([]);
    }
    await expect(
      createSupabaseActivityRepository(anonClient()).list({ page: 1, pageSize: 10 }),
    ).rejects.toMatchObject({
      kind: 'forbidden',
    });
    await expect(createSupabaseActivityRepository(member.client()).record(entry())).rejects.toMatchObject({
      kind: 'forbidden',
    });
  });

  it('pages the log and clamps a page past the end; a made-up person matches nobody', async () => {
    const repo = createSupabaseActivityRepository(editor.client());
    const first = await repo.list({ page: 1, pageSize: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.pageCount).toBe(Math.ceil(first.total / 2));
    const past = await repo.list({ page: 9999, pageSize: 2 });
    expect(past.page).toBe(first.pageCount);
    expect(past.items.length).toBeGreaterThan(0);
    const nobody = await repo.list({ actorId: 'u-ana', page: 1, pageSize: 10 });
    expect(nobody).toMatchObject({ items: [], total: 0, pageCount: 1 });
    expect(nobody.actors.length).toBeGreaterThan(0);
  });

  it('keeps entries of a person whose account is gone, as the system’s', async () => {
    const gone = await createTestUser({ role: 'editor', name: 'Gone Editor' });
    const target = `Contract ${crypto.randomUUID()}`;
    await createSupabaseActivityRepository(gone.client()).record(entry({ target }));
    await gone.cleanup();
    const rows = (await serviceClient().from('activity_log').select('actor').eq('target', target)).data!;
    expect(rows).toEqual([{ actor: null }]);
    const page = await createSupabaseActivityRepository(editor.client()).list({ page: 1, pageSize: 1 });
    expect(page.items[0]).toMatchObject({ target, actor: null });
  });
});
