import { describe, expect, it } from 'vitest';

import { journeyInputSchema } from '../../schemas/journey.schema';
import { journeyFixture } from './journey';

describe('Journey sample data', () => {
  it('is valid content (the same rules the admin form uses)', () => {
    expect(journeyInputSchema.safeParse(journeyFixture).success).toBe(true);
  });

  it('has the canvas content: six steps with three benefits, a photo and a quote each', () => {
    expect(journeyFixture.steps.map((step) => step.title.mk)).toEqual([
      'Join',
      'Participate',
      'Volunteer & Organize',
      'Go International',
      'Lead',
      'Stay Connected',
    ]);
    for (const step of journeyFixture.steps) {
      expect(step.bullets).toHaveLength(3);
      expect(step.photo).not.toBeNull();
      expect(step.quote).not.toBeNull();
    }
  });

  it('gives every step and benefit its own id', () => {
    const ids = journeyFixture.steps.flatMap((step) => [step.id, ...step.bullets.map((bullet) => bullet.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
