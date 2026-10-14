import type { InternalNote, InternalNoteInput, NoteEntity } from '../types';

/** Internal notes on inbox items. Never public: only the board's own screens read them. */
export interface NotesRepository {
  /** Oldest first, so a thread reads top to bottom. */
  list(entityType: NoteEntity, entityId: string): Promise<InternalNote[]>;
  /** Number of notes per entity id of one kind (for badges in lists). */
  counts(entityType: NoteEntity): Promise<Record<string, number>>;
  add(input: InternalNoteInput, now: Date): Promise<InternalNote>;
}
