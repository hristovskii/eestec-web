import { describe, expect, it } from 'vitest';

import type { JourneyInput } from '../types';
import type { JourneyRepository } from './journey.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test puts the content back.

const both = (text: string) => ({ mk: text, en: text });

export function describeJourneyRepository(
  name: string,
  createRepo: () => JourneyRepository | Promise<JourneyRepository>,
) {
  describe(`JourneyRepository (${name})`, () => {
    it('has content to start with: texts, steps with bullets, and a final call to action', async () => {
      const journey = await (await createRepo()).get();
      expect(journey.hero.title.mk).not.toBe('');
      expect(journey.steps.length).toBeGreaterThan(0);
      expect(journey.steps[0]!.bullets.length).toBeGreaterThan(0);
      expect(journey.cta.button.href).not.toBe('');
    });

    it('saves what it is given, in the order given, and returns the stored result', async () => {
      const repo = await createRepo();
      const before = await repo.get();
      const changed: JourneyInput = {
        ...before,
        hero: { ...before.hero, title: both('A new title') },
        steps: [...before.steps]
          .reverse()
          .map((step, index) => (index === 0 ? { ...step, quote: null, photo: null, bullets: [] } : step)),
      };
      try {
        const saved = await repo.save(changed);
        expect(saved.hero.title.mk).toBe('A new title');
        expect(saved.steps.map((step) => step.id)).toEqual(changed.steps.map((step) => step.id));
        expect(saved.steps[0]).toMatchObject({ quote: null, photo: null, bullets: [] });
        expect((await repo.get()).steps.map((step) => step.id)).toEqual(changed.steps.map((step) => step.id));
      } finally {
        await repo.save(before);
      }
      expect(await repo.get()).toEqual(before);
    });
  });
}
