import { describe, expect, it } from 'vitest';

import type { ActivityRepository } from './activity.repository';

export function describeActivityRepository(
  name: string,
  create: () => ActivityRepository | Promise<ActivityRepository>,
) {
  describe(`ActivityRepository (${name})`, () => {
    it('lists newest first and filters by area and person', async () => {
      const repo = await create();
      const all = await repo.list({ page: 1, pageSize: 50 });
      const times = all.items.map((entry) => Date.parse(entry.at));
      expect(times).toEqual([...times].sort((a, b) => b - a));
      expect(all.actors.length).toBeGreaterThan(0);

      const media = await repo.list({ area: 'media', page: 1, pageSize: 50 });
      expect(media.items.every((entry) => entry.area === 'media')).toBe(true);

      const person = all.actors[0]!;
      const own = await repo.list({ actorId: person.userId, page: 1, pageSize: 50 });
      expect(own.items.length).toBeGreaterThan(0);
      expect(own.items.every((entry) => entry.actor?.userId === person.userId)).toBe(true);
    });

    it('records new entries at the top (times compared across time zones)', async () => {
      const repo = await create();
      const [newest] = (await repo.list({ page: 1, pageSize: 1 })).items;
      // One minute after the newest entry, written in UTC.
      const at = new Date(Date.parse(newest!.at) + 60_000).toISOString();
      await repo.record({
        at,
        actor: { userId: 'u-ana', name: 'Ana Trajkovska', initials: 'AT' },
        action: 'updated',
        area: 'settings',
        target: 'Settings › Events',
      });
      const [first] = (await repo.list({ page: 1, pageSize: 1 })).items;
      expect(first).toMatchObject({ action: 'updated', target: 'Settings › Events' });
      expect(first?.id).toBeTruthy();
    });
  });
}
