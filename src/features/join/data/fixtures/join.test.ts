import { describe, expect, it } from 'vitest';

import { joinInputSchema } from '../../schemas/join.schema';
import { joinFixture } from './join';

describe('Join sample data', () => {
  it('is valid content (the same rules the admin form uses)', () => {
    expect(joinInputSchema.safeParse(joinFixture).success).toBe(true);
  });

  it('has the canvas content: 6 benefits, 4 steps, 4 conduct cards, 3 documents, 6 FAQ items', () => {
    expect(joinFixture.benefits).toHaveLength(6);
    expect(joinFixture.steps).toHaveLength(4);
    expect(joinFixture.rules.conduct).toHaveLength(4);
    expect(joinFixture.documents.map((document) => document.title.mk)).toEqual([
      'Statute',
      'Internal rules',
      'Code of conduct',
    ]);
    expect(joinFixture.faq).toHaveLength(6);
    expect(joinFixture.apply.interests.map((line) => line.text.mk)).toEqual([
      'IT',
      'PR',
      'Design',
      'Events',
      'Fundraising',
      'Trainings',
    ]);
  });

  it('gives every row its own id', () => {
    const ids = [
      ...joinFixture.glance,
      ...joinFixture.benefits,
      ...joinFixture.eligibility.items,
      ...joinFixture.steps,
      ...joinFixture.rules.rights,
      ...joinFixture.rules.duties,
      ...joinFixture.rules.conduct,
      ...joinFixture.rules.international.before,
      ...joinFixture.rules.international.during,
      ...joinFixture.rules.international.after,
      ...joinFixture.documents,
      ...joinFixture.faq,
      ...joinFixture.apply.faculties,
      ...joinFixture.apply.interests,
      ...joinFixture.apply.heardFrom,
    ].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
