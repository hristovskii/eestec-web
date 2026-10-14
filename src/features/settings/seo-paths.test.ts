import { describe, expect, it } from 'vitest';

import { publicPagePaths } from './types';

describe('publicPagePaths', () => {
  it('leaves the member pages out in Phase 1', () => {
    const paths = publicPagePaths(false);
    expect(paths).toEqual([
      '/',
      '/events',
      '/upcoming',
      '/journey',
      '/join',
      '/partners',
      '/contact',
      '/privacy',
    ]);
  });

  it('adds them when member accounts are on', () => {
    expect(publicPagePaths(true)).toEqual(expect.arrayContaining(['/members', '/memories', '/submit']));
  });
});
