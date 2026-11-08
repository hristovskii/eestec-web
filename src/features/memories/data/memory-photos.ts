import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import type { MemoryPhotoFile } from '../types';

// Photos of Memories, in memory (stands in for the public-media bucket): per server instance,
// gone after a restart. The browser compresses each photo before sending it (domain/memory-fields).
// Served by /api/dev-memory-photos/[id].

const table = () =>
  mockTable<{ files: Record<string, MemoryPhotoFile> }>('memoryPhotos', () => ({ files: {} }));

export function saveMockMemoryPhoto(photo: MemoryPhotoFile): string {
  const id = crypto.randomUUID();
  table().files[id] = photo;
  return id;
}

export const readMockMemoryPhoto = (id: string): MemoryPhotoFile | null => table().files[id] ?? null;

export const memoryPhotoUrl = (id: string) => `/api/dev-memory-photos/${id}`;

export function deleteMockMemoryPhoto(id: string): void {
  delete table().files[id];
}
