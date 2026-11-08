import { describe, expect, it } from 'vitest';

import type { IdeaFormRepository } from './form.repository';

export function describeIdeaFormRepository(
  name: string,
  createRepo: () => IdeaFormRepository | Promise<IdeaFormRepository>,
) {
  describe(`IdeaFormRepository (${name})`, () => {
    it('has the intro texts and the idea types, in both languages', async () => {
      const repo = await createRepo();
      const form = await repo.get();
      expect(form.types.length).toBeGreaterThan(0);
      expect(form.types.every((type) => type.name.mk && type.name.en)).toBe(true);
      expect(form.intro.idea.mk).not.toBe('');
      expect(form.intro.impression.mk).not.toBe('');
    });

    it('stores what was saved and puts the sample back afterwards', async () => {
      const repo = await createRepo();
      const original = await repo.get();
      try {
        const changed = {
          ...original,
          intro: { ...original.intro, idea: { mk: 'Ново', en: 'New' } },
          types: [...original.types, { id: 'itype-new', name: { mk: 'Ново' } }],
        };
        expect(await repo.save(changed)).toEqual(changed);
        expect(await repo.get()).toEqual(changed);
      } finally {
        await repo.save(original);
      }
    });
  });
}
