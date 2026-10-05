import { describe, expect, it } from 'vitest';

import { pageItems, pageRange } from './pagination';

describe('pageItems', () => {
  it('lists every page when there are few', () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('matches the canvas for page 1 of 8', () => {
    expect(pageItems(1, 8)).toEqual([1, 2, 3, 'gap', 8]);
  });

  it('shows neighbours around a middle page', () => {
    expect(pageItems(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
  });

  it('handles the end of the range', () => {
    expect(pageItems(8, 8)).toEqual([1, 'gap', 6, 7, 8]);
  });
});

describe('pageRange', () => {
  it('computes the visible range', () => {
    expect(pageRange(1, 12, 96)).toEqual({ from: 1, to: 12 });
    expect(pageRange(8, 12, 90)).toEqual({ from: 85, to: 90 });
    expect(pageRange(1, 12, 0)).toEqual({ from: 0, to: 0 });
  });
});
