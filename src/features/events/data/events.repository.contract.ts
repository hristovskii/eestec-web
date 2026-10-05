import { describe, expect, it } from 'vitest';

import type { EventsRepository } from './events.repository';

export function describeEventsRepository(
  name: string,
  create: () => EventsRepository | Promise<EventsRepository>,
) {
  describe(`EventsRepository (${name})`, () => {
    it('lists every event as a choice, newest first', async () => {
      const options = await (await create()).listOptions();
      expect(options.length).toBeGreaterThan(0);
      const times = options.map((option) => Date.parse(option.startsAt));
      expect(times).toEqual([...times].sort((a, b) => b - a));
      expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
    });
  });
}
