import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anonClient, createTestUser } from '../../../../tests/supabase/harness';
import { createSupabaseNotesRepository } from './notes.supabase';
import { describeNotesRepository } from './notes.repository.contract';
import type { InternalNoteInput } from '../types';

let editor: Awaited<ReturnType<typeof createTestUser>>;
let manager: Awaited<ReturnType<typeof createTestUser>>;
let member: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor', name: 'Test Admin' });
  manager = await createTestUser({ role: 'event_manager' });
  member = await createTestUser({ member: 'active' });
});
afterAll(async () => {
  await editor.cleanup();
  await manager.cleanup();
  await member.cleanup();
});

const input = (entityId: string, authorId = editor.id): InternalNoteInput => ({
  entityType: 'contact_message',
  entityId,
  authorId,
  authorName: 'ignored',
  authorInitials: 'XX',
  body: 'A note',
});

describeNotesRepository('supabase', () => createSupabaseNotesRepository(editor.client()), {
  author: () => ({ id: editor.id, name: 'Test Admin', initials: 'TA' }),
  databaseClock: true,
});

describe('NotesRepository (supabase, who may do what)', () => {
  it('signs a note with the signed-in person, whatever the input says', async () => {
    const repo = createSupabaseNotesRepository(editor.client());
    const note = await repo.add(
      { ...input(crypto.randomUUID(), 'someone-else'), authorId: crypto.randomUUID() },
      new Date(0),
    );
    expect(note).toMatchObject({ authorId: editor.id, authorName: 'Test Admin', authorInitials: 'TA' });
    expect(Date.parse(note.createdAt)).toBeGreaterThan(Date.parse('2026-11-01'));
  });

  it('keeps a note when its author is gone (no id, the name stays)', async () => {
    const gone = await createTestUser({ role: 'editor', name: 'Gone Editor' });
    const entityId = crypto.randomUUID();
    await createSupabaseNotesRepository(gone.client()).add(input(entityId, gone.id), new Date());
    await gone.cleanup();
    const [note] = await createSupabaseNotesRepository(editor.client()).list('contact_message', entityId);
    expect(note).toMatchObject({ authorId: null, authorName: 'Gone Editor', authorInitials: 'GE' });
  });

  it('is private to the board: nobody else can read, count or add notes', async () => {
    const entityId = crypto.randomUUID();
    await createSupabaseNotesRepository(editor.client()).add(input(entityId), new Date());
    for (const other of [manager.client(), member.client()]) {
      const repo = createSupabaseNotesRepository(other);
      expect(await repo.list('contact_message', entityId)).toEqual([]);
      expect(await repo.counts('contact_message')).toEqual({});
      await expect(repo.add(input(entityId), new Date())).rejects.toMatchObject({ kind: 'forbidden' });
    }
    const visitor = createSupabaseNotesRepository(anonClient());
    await expect(visitor.list('contact_message', entityId)).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(visitor.add(input(entityId), new Date())).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('refuses an empty or too long note and an unknown kind of item', async () => {
    const repo = createSupabaseNotesRepository(editor.client());
    const entityId = crypto.randomUUID();
    await expect(repo.add({ ...input(entityId), body: '' }, new Date())).rejects.toMatchObject({
      kind: 'invalid',
    });
    await expect(repo.add({ ...input(entityId), body: 'x'.repeat(1001) }, new Date())).rejects.toMatchObject({
      kind: 'invalid',
    });
    await expect(
      repo.add({ ...input(entityId), entityType: 'bogus' as never }, new Date()),
    ).rejects.toMatchObject({
      kind: 'invalid',
    });
  });

  it('answers "no notes" for an id that is not a database id', async () => {
    expect(await createSupabaseNotesRepository(editor.client()).list('contact_message', 'cm-1234')).toEqual(
      [],
    );
  });
});
