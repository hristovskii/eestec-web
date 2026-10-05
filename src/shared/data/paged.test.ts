import { describe, expect, it } from 'vitest';

import { paginate } from './paged';

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it('returns the requested page', () => {
    expect(paginate(items, 2, 12)).toMatchObject({
      items: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
      total: 25,
      page: 2,
      pageCount: 3,
    });
  });

  it('clamps out-of-range pages', () => {
    expect(paginate(items, 9, 12).page).toBe(3);
    expect(paginate(items, 0, 12).page).toBe(1);
  });

  it('has one empty page for no items', () => {
    expect(paginate([], 1, 12)).toMatchObject({ items: [], total: 0, page: 1, pageCount: 1 });
  });
});
