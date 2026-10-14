import { describe, expect, it } from 'vitest';

import type { InternalNoteInput } from '../types';
import type { NotesRepository } from './notes.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test uses an entity of its own.

const NOW = new Date('2026-10-04T18:05:00+02:00');

const input = (entityId: string, body: string): InternalNoteInput => ({
  entityType: 'partner_inquiry',
  entityId,
  authorId: 'u-test',
  authorName: 'Test Admin',
  authorInitials: 'TA',
  body,
});

export function describeNotesRepository(
  name: string,
  createRepo: () => NotesRepository | Promise<NotesRepository>,
) {
  describe(`NotesRepository (${name})`, () => {
    it('adds a note and lists the notes of one item, oldest first', async () => {
      const repo = await createRepo();
      const entityId = `pi-${crypto.randomUUID().slice(0, 8)}`;
      expect(await repo.list('partner_inquiry', entityId)).toEqual([]);
      const first = await repo.add(input(entityId, 'First'), new Date('2026-10-04T18:05:00+02:00'));
      const second = await repo.add(input(entityId, 'Second'), new Date('2026-10-04T19:05:00+02:00'));
      expect(first).toMatchObject({ body: 'First', authorName: 'Test Admin', createdAt: NOW.toISOString() });
      expect((await repo.list('partner_inquiry', entityId)).map((note) => note.id)).toEqual([
        first.id,
        second.id,
      ]);
    });

    it('keeps the notes of different items and kinds apart, and counts them', async () => {
      const repo = await createRepo();
      const one = `pi-${crypto.randomUUID().slice(0, 8)}`;
      const other = `pi-${crypto.randomUUID().slice(0, 8)}`;
      await repo.add(input(one, 'A'), NOW);
      await repo.add(input(one, 'B'), NOW);
      await repo.add(input(other, 'C'), NOW);
      expect(await repo.list('contact_message', one)).toEqual([]);
      const counts = await repo.counts('partner_inquiry');
      expect(counts[one]).toBe(2);
      expect(counts[other]).toBe(1);
    });
  });
}
