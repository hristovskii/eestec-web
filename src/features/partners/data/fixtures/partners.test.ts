import { describe, expect, it } from 'vitest';

import { pastYears, sponsorStatus } from '../../domain/sponsor-status';
import { groupByTier } from '../../domain/tiers';
import { partnersPageFixture, sponsorsFixture, tiersFixture } from './partners';

// The canvas "today" (4 Oct 2026): the sample partners are active, the past ones have ended.
const today = '2026-10-04';

describe('partners fixtures', () => {
  it('put every sponsor in a tier that exists', () => {
    const ids = new Set(tiersFixture.map((tier) => tier.id));
    expect(sponsorsFixture.every((sponsor) => ids.has(sponsor.tierId))).toBe(true);
  });

  it('point at the sample library files (media fixtures hold them, and the media tests check them)', () => {
    for (const sponsor of sponsorsFixture) {
      if (sponsor.logo) expect(sponsor.logo.mediaId, sponsor.name).toMatch(/^media-sponsor-[a-z]+$/);
    }
    expect(partnersPageFixture.offer.mediaId).toBe('media-doc-offer');
  });

  it('show the canvas tiers: Silver is empty (hidden), FEEIT and UKIM have no logo', () => {
    const active = sponsorsFixture.filter((sponsor) => sponsorStatus(sponsor, today) === 'active');
    const groups = groupByTier(tiersFixture, active);
    expect(groups.map((group) => [group.tier.id, group.sponsors.length])).toEqual([
      ['tier-main', 1],
      ['tier-gold', 3],
      ['tier-partners', 7],
      ['tier-media', 3],
      ['tier-academic', 2],
    ]);
    expect(sponsorsFixture.filter((sponsor) => !sponsor.logo).map((sponsor) => sponsor.name)).toEqual([
      'FEEIT',
      'UKIM',
    ]);
  });

  it('have the four past partners with the canvas years', () => {
    const past = sponsorsFixture.filter((sponsor) => sponsorStatus(sponsor, today) === 'past');
    expect(past.map((sponsor) => [sponsor.name, pastYears(sponsor)])).toEqual([
      ['Orbitel', '2018–2022'],
      ['Hexacore', '2020–2023'],
      ['Polaris Instruments', '2016–2021'],
      ['Nexa Grid', '2019–2024'],
    ]);
  });
});
