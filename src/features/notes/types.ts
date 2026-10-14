/** What an internal note can be attached to (data-model.md: internal_notes.entity_type). */
export const NOTE_ENTITIES = ['contact_message', 'partner_inquiry', 'membership_application'] as const;
export type NoteEntity = (typeof NOTE_ENTITIES)[number];

/** A note only admins see ("Internal notes · only admins see these"). */
export type InternalNote = {
  id: string;
  entityType: NoteEntity;
  entityId: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  body: string;
  createdAt: string;
};

export type InternalNoteInput = Omit<InternalNote, 'id' | 'createdAt'>;

export const NOTE_LIMITS = { body: 1000 } as const;
