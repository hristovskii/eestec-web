import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { buildMyDataZip } from './export-zip';

const base = {
  profile: { name: 'Marija' },
  account: { email: 'm@example.com' },
  consents: { newsletter: true },
  applications: [{ reference: 'AIE-2026-0024' }],
  exportedAt: '2026-11-08T10:00:00.000Z',
};

describe('buildMyDataZip', () => {
  it('holds the readable files, with the JSON written out', () => {
    const files = unzipSync(buildMyDataZip({ ...base, photo: null, cv: null }));
    expect(Object.keys(files).sort()).toEqual([
      'README.txt',
      'account.json',
      'applications.json',
      'consents.json',
      'profile.json',
    ]);
    expect(JSON.parse(strFromU8(files['profile.json']!))).toEqual({ name: 'Marija' });
    expect(strFromU8(files['applications.json']!)).toContain('AIE-2026-0024');
    expect(strFromU8(files['README.txt']!)).toContain('2026-11-08');
  });

  it('adds the photo and the CV when there are some, unchanged', () => {
    const photo = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
    const cv = new TextEncoder().encode('%PDF-1.4 cv');
    const files = unzipSync(
      buildMyDataZip({ ...base, photo: { bytes: photo, extension: 'jpg' }, cv: { bytes: cv } }),
    );
    expect(Array.from(files['photo.jpg']!)).toEqual(Array.from(photo));
    expect(Array.from(files['cv.pdf']!)).toEqual(Array.from(cv));
  });
});
