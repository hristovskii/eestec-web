import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import { createMockNotesRepository } from './notes.mock';
import type { NotesRepository } from './notes.repository';

/** Only the board's screens use it; actions check who may add notes. */
export const notesRepository = (scope: 'public' | 'session' = 'session') =>
  selectImplementation<NotesRepository>('notes', { mock: createMockNotesRepository }, scope);
