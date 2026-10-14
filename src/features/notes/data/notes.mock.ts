import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import type { InternalNote } from '../types';
import { notesFixture } from './fixtures/notes';
import type { NotesRepository } from './notes.repository';

const tables = () =>
  mockTable<{ notes: InternalNote[] }>('internal-notes', () => ({ notes: structuredClone(notesFixture) }));

export function createMockNotesRepository(): NotesRepository {
  const db = tables();
  return {
    list(entityType, entityId) {
      const rows = db.notes.filter((note) => note.entityType === entityType && note.entityId === entityId);
      return Promise.resolve(
        structuredClone([...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt))),
      );
    },

    counts(entityType) {
      const counts: Record<string, number> = {};
      for (const note of db.notes)
        if (note.entityType === entityType) counts[note.entityId] = (counts[note.entityId] ?? 0) + 1;
      return Promise.resolve(counts);
    },

    add(input, now) {
      const note: InternalNote = {
        ...structuredClone(input),
        id: `note-${crypto.randomUUID().slice(0, 8)}`,
        createdAt: now.toISOString(),
      };
      db.notes.push(note);
      return Promise.resolve(structuredClone(note));
    },
  };
}
