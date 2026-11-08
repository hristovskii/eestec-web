import { describe, expect, it } from 'vitest';

import type { ApprovedMemberIdentity } from '@/features/auth';

import { describeMembersRepository } from './members.repository.contract';
import { createMockMembersRepository } from './members.mock';

describeMembersRepository('mock', () => createMockMembersRepository());

const identity = (patch: Partial<ApprovedMemberIdentity> = {}): ApprovedMemberIdentity => ({
  userId: 'u-new-one',
  name: 'Nova Person',
  username: 'nova-person',
  faculty: 'FINKI',
  year: '1',
  visibility: 'members',
  photoUrl: null,
  approvedAt: '2026-10-05T10:00:00.000Z',
  ...patch,
});

describe('a member the board approves', () => {
  it('gets a profile at once: members only by default, no team, new member', async () => {
    const repo = createMockMembersRepository(() => Promise.resolve([identity()]));
    const asVisitor = await repo.getProfile('visitor', 'nova-person', 2026);
    expect(asVisitor).toMatchObject({ kind: 'restricted', name: 'Nova Person', memberSince: '2026-10-05' });
    const asMember = await repo.getProfile('member', 'nova-person', 2026);
    expect(asMember).toMatchObject({ kind: 'full', role: 'new' });
    const list = await repo.listActive('member', { sort: 'name', page: 1, pageSize: 100 }, 2026);
    expect(list.items.map((item) => item.name)).toContain('Nova Person');
  });

  it('is public when they chose so, with their sign-up photo', async () => {
    const repo = createMockMembersRepository(() =>
      Promise.resolve([
        identity({
          userId: 'u-pub',
          username: 'pub-person',
          visibility: 'public',
          photoUrl: '/api/dev-member-photos/x',
        }),
      ]),
    );
    const profile = await repo.getProfile('visitor', 'pub-person', 2026);
    expect(profile).toMatchObject({ kind: 'full', profile: { photo: { src: '/api/dev-member-photos/x' } } });
    expect(await repo.listPublicUsernames()).toContain('pub-person');
  });

  it('never shows a stored hidden profile', async () => {
    const repo = createMockMembersRepository(() => Promise.resolve([]));
    expect(await repo.getProfile('member', 'elena-petrovska', 2026)).toBeNull();
  });
});
