import type { InternalNote } from '../../types';

// SAMPLE DATA, transcribed from handoff/design-source/AdminInbox.dc.html: the one note under
// Elena Petrovska's message, and one made up under the PCB idea (docs/sample-data.md).

export const notesFixture: InternalNote[] = [
  {
    id: 'note-1',
    entityType: 'contact_message',
    entityId: 'cm-1',
    authorId: 'u-daniel',
    authorName: 'Daniel Ristov',
    authorInitials: 'DR',
    body: "I'll answer and invite her to Wednesday's meeting.",
    createdAt: '2026-10-04T18:05:00+02:00',
  },
  {
    id: 'note-2',
    entityType: 'idea',
    entityId: 'idea-pcb',
    authorId: 'u-ana',
    authorName: 'Ana Trajkovska',
    authorInitials: 'AT',
    body: 'Daniel can teach KiCad. Let me check whether the workshop room has enough laptops.',
    createdAt: '2026-10-04T12:30:00+02:00',
  },
];
