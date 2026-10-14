import { describe, expect, it } from 'vitest';

import { pastYears, sponsorStatus } from './sponsor-status';

const today = '2026-10-14';
const sponsor = (patch: Partial<Parameters<typeof sponsorStatus>[0]> = {}) => ({
  isActive: true,
  activeFrom: '',
  activeTo: '',
  ...patch,
});

describe('sponsorStatus', () => {
  it('is active with no dates, and within them (both ends included)', () => {
    expect(sponsorStatus(sponsor(), today)).toBe('active');
    expect(sponsorStatus(sponsor({ activeFrom: '2026-10-14', activeTo: '2026-10-14' }), today)).toBe(
      'active',
    );
    expect(sponsorStatus(sponsor({ activeFrom: '2025-09-01', activeTo: '2027-08-31' }), today)).toBe(
      'active',
    );
  });

  it('moves to past partners the day after "active until"', () => {
    expect(sponsorStatus(sponsor({ activeTo: '2026-10-13' }), today)).toBe('past');
  });

  it('waits for "active from"', () => {
    expect(sponsorStatus(sponsor({ activeFrom: '2026-10-15' }), today)).toBe('scheduled');
  });

  it('is hidden everywhere when switched off, whatever the dates', () => {
    expect(sponsorStatus(sponsor({ isActive: false }), today)).toBe('inactive');
    expect(sponsorStatus(sponsor({ isActive: false, activeTo: '2020-01-01' }), today)).toBe('inactive');
  });
});

describe('pastYears', () => {
  it('shows from–to years, one year when they match, only the end without a start, nothing without an end', () => {
    expect(pastYears({ activeFrom: '2018-09-01', activeTo: '2022-08-31' })).toBe('2018–2022');
    expect(pastYears({ activeFrom: '2022-01-01', activeTo: '2022-12-31' })).toBe('2022');
    expect(pastYears({ activeFrom: '', activeTo: '2022-08-31' })).toBe('2022');
    expect(pastYears({ activeFrom: '2018-09-01', activeTo: '' })).toBe('');
  });
});
