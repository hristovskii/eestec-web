import 'server-only';

import { type RepoScope, selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import { createMockNotesRepository } from './notes.mock';
import type { NotesRepository } from './notes.repository';
import { createSupabaseNotesRepository } from './notes.supabase';

/** Only the board's screens use it; actions check who may add notes. */
export const notesRepository = (scope: RepoScope = 'session') =>
  selectImplementation<NotesRepository>(
    'notes',
    { mock: createMockNotesRepository, supabase: withClient(createSupabaseNotesRepository) },
    scope,
  );
