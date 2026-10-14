import { describe, expect, it } from 'vitest';

import { DEFAULT_LAYOUT } from '../domain/layout';
import type { HomeInput } from '../types';
import type { HomeRepository } from './home.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test puts the content back.

const both = (text: string) => ({ mk: text, en: text });

export function describeHomeRepository(
  name: string,
  createRepo: () => HomeRepository | Promise<HomeRepository>,
) {
  describe(`HomeRepository (${name})`, () => {
    it('has content to start with: a hero, activities, milestones and numbers', async () => {
      const home = await (await createRepo()).get();
      expect(home.hero.headline.mk).not.toBe('');
      expect(home.activities.length).toBeGreaterThan(0);
      expect(home.milestones.length).toBeGreaterThan(0);
      expect(home.stats.length).toBeGreaterThan(0);
      expect(home.layout.length).toBeGreaterThan(0);
    });

    it('saves what it is given and returns the stored result', async () => {
      const repo = await createRepo();
      const before = await repo.get();
      const changed: HomeInput = {
        ...before,
        hero: { ...before.hero, headline: both('A new headline') },
        stats: [{ id: 's-test', label: both('Test'), value: 7, suffix: '+' }],
        layout: DEFAULT_LAYOUT.map((item) => ({ ...item, visible: item.key !== 'map' })),
      };
      try {
        const saved = await repo.save(changed);
        expect(saved.hero.headline.mk).toBe('A new headline');
        expect(saved.stats).toEqual(changed.stats);
        expect((await repo.get()).layout.find((item) => item.key === 'map')?.visible).toBe(false);
      } finally {
        await repo.save(before);
      }
      expect(await repo.get()).toEqual(before);
    });

    it('keeps the order of lists as given', async () => {
      const repo = await createRepo();
      const before = await repo.get();
      const reversed = { ...before, milestones: [...before.milestones].reverse() };
      try {
        const saved = await repo.save(reversed);
        expect(saved.milestones.map((item) => item.id)).toEqual(reversed.milestones.map((item) => item.id));
      } finally {
        await repo.save(before);
      }
    });
  });
}
