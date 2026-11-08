import { describe, expect, it } from 'vitest';

import { memberRole, yearOf } from './member-role';

describe('memberRole', () => {
  it('lets a team lead win over a trainer, a new member and a member', () => {
    expect(memberRole([{ role: 'member' }, { role: 'lead' }], '2026-10-01', 2026)).toBe('lead');
    expect(memberRole([{ role: 'trainer' }], '2022-10-01', 2026)).toBe('trainer');
  });

  it('calls someone who joined this year a new member, and later a member', () => {
    expect(memberRole([{ role: 'member' }], '2026-10-01', 2026)).toBe('new');
    expect(memberRole([{ role: 'member' }], '2026-10-01', 2027)).toBe('member');
    expect(memberRole([], '2024-10-01', 2026)).toBe('member');
  });

  it('reads the year of a date without time zones', () => {
    expect(yearOf('2023-10-01')).toBe(2023);
    expect(yearOf('2026-12-31T23:30:00-05:00')).toBe(2026);
  });
});
