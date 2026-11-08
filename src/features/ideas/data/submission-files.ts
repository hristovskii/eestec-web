import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

// Files that come with ideas and feedback (an attachment, photos), in memory (stands in for the
// private `submissions` bucket): per server instance, gone after a restart. Never public: only
// /api/dev-submissions/[id] serves them, to the board.

export type SubmissionFileBlob = { bytes: Uint8Array; mimeType: string; name: string };

const table = () =>
  mockTable<{ files: Record<string, SubmissionFileBlob> }>('submissionFiles', () => ({ files: {} }));

export function saveMockSubmissionFile(blob: SubmissionFileBlob): string {
  const id = crypto.randomUUID();
  table().files[id] = blob;
  return id;
}

export const readMockSubmissionFile = (id: string): SubmissionFileBlob | null => table().files[id] ?? null;
