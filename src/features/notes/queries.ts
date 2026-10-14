import 'server-only';

import { notesRepository } from './data';
import type { InternalNote, NoteEntity } from './types';

/** The notes of one inbox item, oldest first; never cached. Callers check the permission. */
export async function listNotes(entityType: NoteEntity, entityId: string): Promise<InternalNote[]> {
  return (await notesRepository()).list(entityType, entityId);
}

/** How many notes each item of one kind has (for the lists). */
export async function countNotes(entityType: NoteEntity): Promise<Record<string, number>> {
  return (await notesRepository()).counts(entityType);
}
