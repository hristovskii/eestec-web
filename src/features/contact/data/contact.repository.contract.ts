import { describe, expect, it } from 'vitest';

import type { ContactRepository } from './contact.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test puts the content back.

const both = (text: string) => ({ mk: text, en: text });

export function describeContactRepository(
  name: string,
  createRepo: () => ContactRepository | Promise<ContactRepository>,
) {
  describe(`ContactRepository (${name})`, () => {
    it('has content to start with: texts, subjects with a route, and a map position', async () => {
      const contact = await (await createRepo()).get();
      expect(contact.hero.title.mk).not.toBe('');
      expect(contact.subjects.length).toBeGreaterThan(0);
      expect(contact.subjects.every((subject) => subject.routeEmail.includes('@'))).toBe(true);
      expect(contact.map.lat).toBeGreaterThan(-90);
    });

    it('saves what it is given, in the order given, and returns the stored result', async () => {
      const repo = await createRepo();
      const before = await repo.get();
      const changed = {
        ...before,
        hero: { ...before.hero, title: both('A new title') },
        subjects: [...before.subjects].reverse(),
      };
      try {
        const saved = await repo.save(changed);
        expect(saved.hero.title.mk).toBe('A new title');
        expect(saved.subjects.map((subject) => subject.id)).toEqual(
          changed.subjects.map((subject) => subject.id),
        );
        expect((await repo.get()).subjects.map((subject) => subject.id)).toEqual(
          changed.subjects.map((subject) => subject.id),
        );
      } finally {
        await repo.save(before);
      }
      expect(await repo.get()).toEqual(before);
    });
  });
}
