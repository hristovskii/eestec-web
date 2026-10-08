import { describe, expect, it } from 'vitest';

import { isCountryCode } from '@/shared/i18n/country';

import { committeesFixture } from './committees';

// The sample list must match the numbers on the canvas ("All · 35", 23 / 8 / 4, 21 countries).
describe('committees fixture', () => {
  const count = (status: string) => committeesFixture.filter((item) => item.status === status).length;

  it('matches the canvas counts', () => {
    expect(committeesFixture).toHaveLength(35);
    expect([count('lc'), count('observer'), count('jlc')]).toEqual([23, 8, 4]);
    expect(new Set(committeesFixture.map((item) => item.country)).size).toBe(21);
  });

  it('has exactly one committee of ours: LC Skopje', () => {
    const home = committeesFixture.filter((item) => item.isHome);
    expect(home.map((item) => item.name)).toEqual(['LC Skopje']);
    expect(home[0]?.url).toBe('https://eestec.mk');
  });

  it('has unique ids and names, valid countries and coordinates in Europe', () => {
    expect(new Set(committeesFixture.map((item) => item.id)).size).toBe(35);
    expect(new Set(committeesFixture.map((item) => item.name)).size).toBe(35);
    for (const item of committeesFixture) {
      expect(isCountryCode(item.country)).toBe(true);
      expect(item.lat).toBeGreaterThan(34);
      expect(item.lat).toBeLessThan(66);
      expect(item.lng).toBeGreaterThan(-11);
      expect(item.lng).toBeLessThan(40);
    }
  });
});
