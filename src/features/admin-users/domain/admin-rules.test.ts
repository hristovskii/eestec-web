import { describe, expect, it } from 'vitest';

import type { AdminAccount } from '@/features/auth';

import { adminChangeProblem, lastActive } from './admin-rules';

const admin = (
  userId: string,
  role: AdminAccount['role'],
  status: AdminAccount['status'] = 'active',
): AdminAccount => ({
  userId,
  name: userId,
  email: `${userId}@eestec.mk`,
  initials: 'XX',
  role,
  managedEventIds: [],
  twoFactor: 'on',
  status,
  lastActiveAt: null,
  invitedAt: null,
});

describe('adminChangeProblem', () => {
  const ana = admin('ana', 'super_admin');
  const stefan = admin('stefan', 'editor');

  it('never lets you change or remove your own access', () => {
    expect(adminChangeProblem({ actorId: 'ana', target: ana, next: 'editor', admins: [ana] })).toBe('self');
  });

  it('keeps at least one active super admin', () => {
    const boris = admin('boris', 'super_admin');
    expect(
      adminChangeProblem({ actorId: 'ana', target: boris, next: 'editor', admins: [ana, boris] }),
    ).toBeNull();
    // An invited super admin doesn't count: they can't sign in yet.
    const invited = admin('invited', 'super_admin', 'invited');
    expect(
      adminChangeProblem({ actorId: 'stefan', target: ana, next: null, admins: [ana, stefan, invited] }),
    ).toBe('lastSuperAdmin');
    expect(
      adminChangeProblem({ actorId: 'ana', target: stefan, next: null, admins: [ana, stefan] }),
    ).toBeNull();
  });
});

describe('lastActive', () => {
  const now = new Date('2026-10-04T18:18:00+02:00');
  it('reads like the canvas', () => {
    expect(lastActive('2026-10-04T18:15:00+02:00', now)).toEqual({ kind: 'now' });
    expect(lastActive('2026-10-04T16:02:00+02:00', now).kind).toBe('today');
    expect(lastActive('2026-10-03T21:14:00+02:00', now).kind).toBe('yesterday');
    expect(lastActive('2026-10-02T16:40:00+02:00', now).kind).toBe('recent');
    expect(lastActive('2026-09-20T10:00:00+02:00', now).kind).toBe('older');
    expect(lastActive(null, now)).toEqual({ kind: 'never' });
  });
  it('uses the Skopje calendar day (just after midnight is "today")', () => {
    expect(lastActive('2026-10-04T00:10:00+02:00', now).kind).toBe('today');
  });
});
