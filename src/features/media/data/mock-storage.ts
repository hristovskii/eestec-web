import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

// Mock file storage behind the two-step upload (stands in for Supabase Storage). Files live in
// memory: per server instance, gone after a restart or "Reset sample data".

export type PendingUpload = {
  fileName: string;
  mimeType: string;
  size: number;
  userId: string;
  uploaderName: string;
  received: boolean;
};

type Storage = {
  pending: Record<string, PendingUpload>;
  files: Record<string, { mimeType: string; bytes: Uint8Array }>;
};

export const mockStorage = () => mockTable<Storage>('mediaStorage', () => ({ pending: {}, files: {} }));

/** The URL the browser PUTs to, and later the file's public URL. */
export const mockFileUrl = (uploadId: string) => `/api/dev-uploads/${uploadId}`;

export type ReceiveResult = 'ok' | 'not_found' | 'forbidden' | 'mismatch';

/** PUT /api/dev-uploads/[id]: store the bytes of a reserved upload. */
export function receiveMockUpload(
  uploadId: string,
  { userId, mimeType, bytes }: { userId: string; mimeType: string; bytes: Uint8Array },
): ReceiveResult {
  const storage = mockStorage();
  const pending = storage.pending[uploadId];
  if (!pending) return 'not_found';
  if (pending.userId !== userId) return 'forbidden';
  // The file must be the one that was announced (type and exact size).
  if (pending.mimeType !== mimeType || pending.size !== bytes.byteLength) return 'mismatch';
  storage.files[uploadId] = { mimeType, bytes };
  pending.received = true;
  return 'ok';
}

/** GET /api/dev-uploads/[id]. */
export function readMockFile(uploadId: string) {
  return mockStorage().files[uploadId] ?? null;
}
