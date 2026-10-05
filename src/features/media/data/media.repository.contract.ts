import { describe, expect, it } from 'vitest';

import type { MediaListQuery } from '../types';
import type { MediaRepository } from './media.repository';

const query = (patch: Partial<MediaListQuery> = {}): MediaListQuery => ({
  sort: 'newest',
  page: 1,
  pageSize: 24,
  ...patch,
});

const now = new Date('2026-10-04T16:18:00Z');
const ana = { userId: 'u-ana', name: 'Ana Trajkovska' };

/**
 * Shared contract for every MediaRepository. `deliver` puts the file bytes where the
 * implementation expects them (the dev route on mocks, Storage on Supabase).
 */
export function describeMediaRepository(
  name: string,
  create: () => MediaRepository | Promise<MediaRepository>,
  deliver: (upload: { uploadId: string; userId: string; mimeType: string; bytes: Uint8Array }) => void,
) {
  describe(`MediaRepository (${name})`, () => {
    it('lists newest first with counts, and filters by kind, missing alt text and uploader', async () => {
      const repo = await create();
      const all = await repo.list(query());
      expect(all.total).toBe(all.counts.all);
      expect(all.counts.image + all.counts.document).toBe(all.counts.all);
      const times = all.items.map((item) => Date.parse(item.uploadedAt));
      expect(times).toEqual([...times].sort((a, b) => b - a));

      const documents = await repo.list(query({ kind: 'document' }));
      expect(documents.items.every((item) => item.kind === 'document')).toBe(true);

      const missing = await repo.list(query({ missingAlt: true }));
      expect(missing.total).toBe(all.counts.missingAlt);
      expect(missing.items.every((item) => item.kind === 'image' && item.alt === null)).toBe(true);

      const own = await repo.list(query({ uploadedBy: 'u-daniel' }));
      expect(own.items.length).toBeGreaterThan(0);
      expect(own.items.every((item) => item.uploadedBy.userId === 'u-daniel')).toBe(true);
      expect(own.counts.all).toBe(own.total);
    });

    it('searches file names and alt texts', async () => {
      const repo = await create();
      const result = await repo.list(query({ q: 'ohrid' }));
      expect(result.items.map((item) => item.fileName)).toContain('ohrid-group-selfie.jpg');
    });

    it('uploads in two steps; nothing is recorded before the file arrives', async () => {
      const repo = await create();
      const bytes = new Uint8Array([137, 80, 78, 71]);
      const { uploadId, uploadUrl } = await repo.createUpload({
        fileName: 'lab.png',
        mimeType: 'image/png',
        size: bytes.byteLength,
        uploadedBy: ana,
      });
      expect(uploadUrl).toBeTruthy();
      const confirm = { uploadId, userId: ana.userId, alt: 'The FEEIT lab', width: 10, height: 5, now };
      await expect(repo.confirmUpload(confirm)).resolves.toBeNull();

      await expect(repo.getUpload(uploadId, ana.userId)).resolves.toEqual({
        mimeType: 'image/png',
        received: false,
      });
      await expect(repo.getUpload(uploadId, 'u-someone-else')).resolves.toBeNull();

      deliver({ uploadId, userId: ana.userId, mimeType: 'image/png', bytes });
      await expect(repo.getUpload(uploadId, ana.userId)).resolves.toMatchObject({ received: true });
      await expect(repo.confirmUpload({ ...confirm, userId: 'u-someone-else' })).resolves.toBeNull();
      const item = await repo.confirmUpload(confirm);
      expect(item).toMatchObject({ fileName: 'lab.png', kind: 'image', alt: 'The FEEIT lab', width: 10 });
      expect((await repo.list(query())).items[0]?.id).toBe(item!.id);
    });

    it('updates alt text and credit, and deletes', async () => {
      const repo = await create();
      const [first] = (await repo.list(query({ missingAlt: true }))).items;
      const updated = await repo.update(first!.id, { alt: 'Dev boards next to a laptop', credit: 'PR team' });
      expect(updated).toMatchObject({ alt: 'Dev boards next to a laptop', credit: 'PR team' });
      await expect(repo.remove(first!.id)).resolves.toBe(true);
      await expect(repo.get(first!.id)).resolves.toBeNull();
      await expect(repo.remove(first!.id)).resolves.toBe(false);
    });
  });
}
