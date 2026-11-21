import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import type { Tables } from '@/shared/data/supabase/database.types';
import { unwrap } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { isoOf } from '@/shared/data/supabase/time';

import type { InternalNote, NoteEntity } from '../types';
import type { NotesRepository } from './notes.repository';

type Row = Tables<'internal_notes'>;

const toNote = (row: Row): InternalNote => ({
  id: row.id,
  entityType: row.entity_type as NoteEntity,
  entityId: row.entity_id,
  authorId: row.author,
  authorName: row.author_name,
  authorInitials: row.author_initials,
  body: row.body,
  createdAt: isoOf(row.created_at),
});

/**
 * Internal notes: only staff read or add them (row-level security and `add_internal_note`). The author is the
 * signed-in person and the time is the database clock, so `add` ignores the author fields and `now` it is given.
 */
export function createSupabaseNotesRepository(client: DbClient): NotesRepository {
  return {
    async list(entityType, entityId) {
      if (!isUuid(entityId)) return [];
      const rows = unwrap(
        await client
          .from('internal_notes')
          .select('*')
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .order('created_at')
          .order('id'),
      );
      return rows.map(toNote);
    },

    async counts(entityType) {
      return unwrap(await client.rpc('internal_note_counts', { p_entity_type: entityType })) as Record<
        string,
        number
      >;
    },

    async add(input) {
      const id = unwrap(
        await client.rpc('add_internal_note', {
          p_entity_type: input.entityType,
          p_entity_id: input.entityId,
          p_body: input.body,
        }),
      );
      return toNote(unwrap(await client.from('internal_notes').select('*').eq('id', id).single()));
    },
  };
}
