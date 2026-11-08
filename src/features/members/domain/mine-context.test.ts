import { describe, expect, it } from 'vitest';

import { toMineContext } from './mine-context';

const session = { userId: 'u1', name: 'Ivo', username: 'ivo', memberStatus: 'active' as const };

describe('toMineContext', () => {
  it('maps the sign-up record: members only by default, public when chosen', () => {
    const base = { faculty: 'FEEIT', photoUrl: '/api/dev-member-photos/x', since: '2026-10-05T10:00:00Z' };
    expect(toMineContext(session, { ...base, visibility: 'members' }, 'now')).toMatchObject({
      faculty: 'FEEIT',
      visibility: 'members_only',
      photoUrl: '/api/dev-member-photos/x',
      since: '2026-10-05T10:00:00Z',
      pending: false,
    });
    expect(toMineContext(session, { ...base, visibility: 'public' }, 'now').visibility).toBe('public');
  });

  it('knows a person waiting for the board, and copes with no sign-up record (sample members)', () => {
    const context = toMineContext({ ...session, memberStatus: 'pending' }, null, '2026-11-08T10:00:00Z');
    expect(context).toMatchObject({
      pending: true,
      faculty: '',
      visibility: 'members_only',
      photoUrl: null,
      since: '2026-11-08T10:00:00Z',
    });
  });
});
