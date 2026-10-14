import { describe, expect, it } from 'vitest';

import type { JoinInput } from '../types';
import type { JoinRepository } from './join.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test puts the content back.

const both = (text: string) => ({ mk: text, en: text });

export function describeJoinRepository(
  name: string,
  createRepo: () => JoinRepository | Promise<JoinRepository>,
) {
  describe(`JoinRepository (${name})`, () => {
    it('has content to start with: texts, benefits, steps, FAQ and form options', async () => {
      const join = await (await createRepo()).get();
      expect(join.hero.title.mk).not.toBe('');
      expect(join.benefits.length).toBeGreaterThan(0);
      expect(join.steps.length).toBeGreaterThan(0);
      expect(join.faq.length).toBeGreaterThan(0);
      expect(join.apply.faculties.length).toBeGreaterThan(0);
      expect(join.documents.every((document) => document.mediaId !== '')).toBe(true);
    });

    it('saves what it is given, in the order given, and returns the stored result', async () => {
      const repo = await createRepo();
      const before = await repo.get();
      const changed: JoinInput = {
        ...before,
        hero: { ...before.hero, title: both('A new title') },
        faq: [...before.faq].reverse(),
        apply: { ...before.apply, open: !before.apply.open },
      };
      try {
        const saved = await repo.save(changed);
        expect(saved.hero.title.mk).toBe('A new title');
        expect(saved.faq.map((item) => item.id)).toEqual(changed.faq.map((item) => item.id));
        expect(saved.apply.open).toBe(!before.apply.open);
        expect((await repo.get()).faq.map((item) => item.id)).toEqual(changed.faq.map((item) => item.id));
      } finally {
        await repo.save(before);
      }
      expect(await repo.get()).toEqual(before);
    });
  });
}
