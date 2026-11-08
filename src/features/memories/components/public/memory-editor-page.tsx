import { getMessages } from 'next-intl/server';

import type { OwnMemory, MemoryContent } from '../../types';
import { type EditorEvent, type EditorInitial, MemoryEditor } from './memory-editor';

const empty: MemoryContent = {
  title: '',
  eventId: null,
  otherEventName: '',
  city: '',
  country: '',
  happenedOn: null,
  body: '',
  cover: null,
  photos: [],
};

/** What the editor opens with: a new Memory, or the author's own (a revision when one is waiting). */
export function editorInitial(own: OwnMemory | null): EditorInitial {
  if (!own)
    return {
      id: null,
      slug: null,
      content: empty,
      mode: 'draft',
      status: 'new',
      updatedAt: null,
      rejection: null,
      live: null,
      revisionRejected: null,
      revisionPending: false,
    };
  const { record } = own;
  const published = record.status === 'published';
  return {
    id: record.id,
    slug: record.slug,
    content: own.editing,
    mode: own.mode,
    status: published ? 'published' : record.status === 'rejected' ? 'rejected' : 'draft',
    updatedAt: record.updatedAt,
    rejection:
      record.status === 'rejected'
        ? {
            reason: record.rejectionReason,
            by: record.reviewedByName,
            at: record.reviewedAt ?? record.updatedAt,
          }
        : null,
    live:
      published && record.publishedAt ? { publishedAt: record.publishedAt, reads: record.readsCount } : null,
    revisionRejected:
      published && record.revision?.status === 'rejected' ? { reason: record.revision.reason } : null,
    revisionPending: published && record.revision?.status === 'pending',
  };
}

/** The editor with the labels its shared parts (rich text, sortable list) read from `admin.ui.*`. */
export async function MemoryEditorPage({
  own,
  events,
  preselectEventId,
}: {
  own: OwnMemory | null;
  events: EditorEvent[];
  preselectEventId: string | null;
}) {
  const messages = (await getMessages()) as unknown as {
    memories: { editor: { richText: Record<string, string>; sortable: Record<string, string> } };
  };
  return (
    <MemoryEditor
      initial={editorInitial(own)}
      events={events}
      preselectEventId={preselectEventId}
      adminUi={{ richText: messages.memories.editor.richText, sortable: messages.memories.editor.sortable }}
    />
  );
}
