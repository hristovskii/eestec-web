import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anonClient, createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import { createSupabaseIdeaFormRepository } from './form.supabase';
import { describeIdeaFormRepository } from './form.repository.contract';

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

let editor: TestUser;
let manager: TestUser;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor', name: 'Form Editor' });
  manager = await createTestUser({ role: 'event_manager', name: 'Form Manager' });
});
afterAll(async () => {
  await editor.cleanup();
  await manager.cleanup();
});

const repoFor = (client: ReturnType<typeof anonClient>) =>
  createSupabaseIdeaFormRepository(client, 'session');

describeIdeaFormRepository('supabase', () => repoFor(editor.client()));

describe('IdeaFormRepository (supabase, who may do what)', () => {
  it('is read by anyone, as the page shows it', async () => {
    const form = await repoFor(anonClient()).get();
    expect(form.types.length).toBeGreaterThan(0);
    expect(form.intro.idea.mk).not.toBe('');
  });

  it('is changed by the board only', async () => {
    const original = await repoFor(editor.client()).get();
    await expect(repoFor(manager.client()).save(original)).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(repoFor(anonClient()).save(original)).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('refuses to remove a type that ideas use, and then changes nothing', async () => {
    const repo = repoFor(editor.client());
    const original = await repo.get();
    const used = original.types[0]!;
    const { error } = await serviceClient()
      .from('ideas')
      .insert({
        reference: `IDE-test-${crypto.randomUUID().slice(0, 8)}`,
        type_id: used.id,
        title: 'Uses a type',
        description: 'A description',
        locale: 'en',
      });
    expect(error).toBeNull();
    const changed = {
      intro: { ...original.intro, idea: { mk: 'Не се зачувува', en: 'Not saved' } },
      types: original.types.filter((type) => type.id !== used.id),
    };
    await expect(repo.save(changed)).rejects.toMatchObject({ kind: 'in_use' });
    expect(await repo.get()).toEqual(original);
    await serviceClient().from('ideas').delete().eq('title', 'Uses a type');
  });

  it('keeps the order of the types as the board arranged them', async () => {
    const repo = repoFor(editor.client());
    const original = await repo.get();
    try {
      const reversed = { ...original, types: [...original.types].reverse() };
      expect((await repo.save(reversed)).types.map((type) => type.id)).toEqual(
        reversed.types.map((type) => type.id),
      );
    } finally {
      await repo.save(original);
    }
  });
});
