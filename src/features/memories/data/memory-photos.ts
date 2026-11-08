import 'server-only';

import { mockTable } from '@/shared/data/mock/store';
import type { AnyMedia } from '@/shared/types/media';

import { memoryPhotoSrc } from '../domain/memory-fields';
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

export const memoryPhotoUrl = memoryPhotoSrc;

export function deleteMockMemoryPhoto(id: string): void {
  delete table().files[id];
}

/**
 * A photo of a Memory as an image for the site. A file lost with the mock store (it restarts empty)
 * or a sample photo shows the striped placeholder.
 */
export function memoryImage(ref: {
  fileId: string | null;
  sample: string | null;
  alt: string;
  credit?: string;
}): AnyMedia {
  const credit = ref.credit ? { credit: ref.credit } : {};
  const file = ref.fileId ? readMockMemoryPhoto(ref.fileId) : null;
  if (ref.fileId && file)
    return {
      src: memoryPhotoUrl(ref.fileId),
      width: file.width,
      height: file.height,
      alt: ref.alt,
      ...credit,
    };
  return { sample: true, caption: ref.sample ?? '', alt: ref.alt, ...credit };
}
