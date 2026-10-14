import { describe, expect, it } from 'vitest';

import { homeFixture } from './home';

describe('Home sample data', () => {
  it('has the canvas content: 6 activities, 5 milestones, 5 numbers', () => {
    expect(homeFixture.activities).toHaveLength(6);
    expect(homeFixture.milestones.map((milestone) => milestone.year)).toEqual([2005, 2011, 2015, 2019, 2025]);
    expect(homeFixture.stats.map((stat) => `${stat.value}${stat.suffix}`)).toEqual([
      '35',
      '21',
      '5000+',
      '80',
      '150+',
    ]);
  });

  it('gives every item its own id', () => {
    for (const list of [homeFixture.activities, homeFixture.milestones, homeFixture.stats]) {
      expect(new Set(list.map((item) => item.id)).size).toBe(list.length);
    }
  });
});
