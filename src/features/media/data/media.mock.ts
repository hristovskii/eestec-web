import 'server-only';

import { paginate } from '@/shared/data/paged';
import { mockTable } from '@/shared/data/mock/store';

import { kindOf, needsAlt } from '../domain/upload-rules';
import type { MediaItem } from '../types';
import { mediaFixture } from './fixtures/media';
import type { MediaRepository } from './media.repository';
import { mockFileUrl, mockStorage } from './mock-storage';

export function createMockMediaRepository(): MediaRepository {
  const table = mockTable<{ items: MediaItem[] }>('media', () => ({ items: mediaFixture }));

  return {
    list(query) {
      const scoped = query.uploadedBy
        ? table.items.filter((item) => item.uploadedBy.userId === query.uploadedBy)
        : table.items;
      const needle = query.q?.trim().toLowerCase();
      const filtered = scoped.filter(
        (item) =>
          (!query.kind || item.kind === query.kind) &&
          (!query.missingAlt || needsAlt(item)) &&
          (!needle ||
            item.fileName.toLowerCase().includes(needle) ||
            (item.alt ?? '').toLowerCase().includes(needle)),
      );
      const sorted = [...filtered].sort((a, b) =>
        query.sort === 'name'
          ? a.fileName.localeCompare(b.fileName)
          : // Compare times, not strings: dates mix offsets (+02:00) and UTC (Z).
            query.sort === 'oldest'
            ? Date.parse(a.uploadedAt) - Date.parse(b.uploadedAt)
            : Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt),
      );
      return Promise.resolve({
        ...paginate(sorted, query.page, query.pageSize),
        counts: {
          all: scoped.length,
          image: scoped.filter((item) => item.kind === 'image').length,
          document: scoped.filter((item) => item.kind === 'document').length,
          missingAlt: scoped.filter(needsAlt).length,
        },
      });
    },

    get(id) {
      return Promise.resolve(table.items.find((item) => item.id === id) ?? null);
    },

    createUpload({ fileName, mimeType, size, uploadedBy }) {
      const uploadId = crypto.randomUUID();
      mockStorage().pending[uploadId] = {
        fileName,
        mimeType,
        size,
        userId: uploadedBy.userId,
        uploaderName: uploadedBy.name,
        received: false,
      };
      return Promise.resolve({ uploadId, uploadUrl: mockFileUrl(uploadId) });
    },

    getUpload(uploadId, userId) {
      const pending = mockStorage().pending[uploadId];
      return Promise.resolve(
        pending && pending.userId === userId
          ? { mimeType: pending.mimeType, received: pending.received }
          : null,
      );
    },

    confirmUpload({ uploadId, userId, alt, credit, width, height, now }) {
      const storage = mockStorage();
      const pending = storage.pending[uploadId];
      if (!pending || pending.userId !== userId || !pending.received) return Promise.resolve(null);
      const kind = kindOf(pending.mimeType) ?? 'document';
      const item: MediaItem = {
        id: uploadId,
        kind,
        fileName: pending.fileName,
        mimeType: pending.mimeType,
        size: pending.size,
        ...(kind === 'image' && width && height ? { width, height } : {}),
        alt: kind === 'image' ? alt : null,
        ...(credit ? { credit } : {}),
        src: mockFileUrl(uploadId),
        uploadedBy: { userId, name: pending.uploaderName },
        uploadedAt: now.toISOString(),
      };
      delete storage.pending[uploadId];
      table.items.unshift(item);
      return Promise.resolve(item);
    },

    update(id, patch) {
      const item = table.items.find((candidate) => candidate.id === id);
      if (!item) return Promise.resolve(null);
      if (patch.alt !== undefined && item.kind === 'image') item.alt = patch.alt;
      if (patch.credit !== undefined) {
        if (patch.credit) item.credit = patch.credit;
        else delete item.credit;
      }
      return Promise.resolve(item);
    },

    remove(id) {
      const index = table.items.findIndex((item) => item.id === id);
      if (index === -1) return Promise.resolve(false);
      table.items.splice(index, 1);
      delete mockStorage().files[id];
      return Promise.resolve(true);
    },
  };
}
