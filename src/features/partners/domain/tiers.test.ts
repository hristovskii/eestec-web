import { describe, expect, it } from 'vitest';

import { CAROUSEL_AFTER, groupByTier, needsCarousel } from './tiers';

describe('groupByTier', () => {
  const tiers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('keeps the tiers in the board’s order and the sponsors in theirs', () => {
    const sponsors = [
      { id: 1, tierId: 'c' },
      { id: 2, tierId: 'a' },
      { id: 3, tierId: 'c' },
    ];
    expect(
      groupByTier(tiers, sponsors).map((group) => [group.tier.id, group.sponsors.map((s) => s.id)]),
    ).toEqual([
      ['a', [2]],
      ['c', [1, 3]],
    ]);
  });

  it('leaves out a tier with nobody in it', () => {
    expect(groupByTier(tiers, [{ id: 1, tierId: 'b' }]).map((group) => group.tier.id)).toEqual(['b']);
    expect(groupByTier(tiers, [])).toEqual([]);
  });
});

describe('needsCarousel (PartnersStates frame)', () => {
  it('scrolls a tier of more than 6 logos on desktop and more than 2 on phones', () => {
    expect(CAROUSEL_AFTER).toEqual({ desktop: 6, mobile: 2 });
    expect(needsCarousel(6, 'desktop')).toBe(false);
    expect(needsCarousel(7, 'desktop')).toBe(true);
    expect(needsCarousel(2, 'mobile')).toBe(false);
    expect(needsCarousel(3, 'mobile')).toBe(true);
  });
});
