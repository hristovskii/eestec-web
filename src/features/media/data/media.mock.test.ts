import { beforeEach, describe, expect, it } from 'vitest';

import { resetMockStore } from '@/shared/data/mock/store';

import { createMockMediaRepository } from './media.mock';
import { describeMediaRepository } from './media.repository.contract';
import { readMockFile, receiveMockUpload } from './mock-storage';

beforeEach(() => resetMockStore());

describeMediaRepository('mock', createMockMediaRepository, ({ uploadId, ...file }) => {
  expect(receiveMockUpload(uploadId, file)).toBe('ok');
});

describe('mock storage', () => {
  it('only accepts the announced file from the uploader', async () => {
    const repo = createMockMediaRepository();
    const { uploadId } = await repo.createUpload({
      fileName: 'a.pdf',
      mimeType: 'application/pdf',
      size: 3,
      uploadedBy: { userId: 'u-ana', name: 'Ana' },
    });
    const bytes = new Uint8Array([1, 2, 3]);
    expect(receiveMockUpload('nope', { userId: 'u-ana', mimeType: 'application/pdf', bytes })).toBe(
      'not_found',
    );
    expect(receiveMockUpload(uploadId, { userId: 'u-daniel', mimeType: 'application/pdf', bytes })).toBe(
      'forbidden',
    );
    expect(receiveMockUpload(uploadId, { userId: 'u-ana', mimeType: 'image/png', bytes })).toBe('mismatch');
    expect(
      receiveMockUpload(uploadId, { userId: 'u-ana', mimeType: 'application/pdf', bytes: new Uint8Array(4) }),
    ).toBe('mismatch');
    expect(receiveMockUpload(uploadId, { userId: 'u-ana', mimeType: 'application/pdf', bytes })).toBe('ok');
    expect(readMockFile(uploadId)?.bytes).toEqual(bytes);
  });
});
