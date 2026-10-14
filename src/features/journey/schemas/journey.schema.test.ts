import { describe, expect, it } from 'vitest';

import { journeyFixture } from '../data/fixtures/journey';
import { journeyInputSchema } from './journey.schema';

const valid = () => structuredClone(journeyFixture);
const firstError = (input: unknown) => {
  const result = journeyInputSchema.safeParse(input);
  return result.success
    ? null
    : `${result.error.issues[0]!.path.join('.')}:${result.error.issues[0]!.message}`;
};

describe('journeyInputSchema', () => {
  it('accepts the sample content', () => {
    expect(firstError(valid())).toBeNull();
  });

  it('needs the Macedonian title of a step, not the English one', () => {
    const journey = valid();
    journey.steps[1]!.title = { mk: ' ' };
    expect(firstError(journey)).toBe('steps.1.title.mk:required');
    journey.steps[1]!.title = { mk: 'Учествувај' };
    expect(firstError(journey)).toBeNull();
  });

  it('wants at least one step and at most eight', () => {
    const journey = valid();
    journey.steps = [];
    expect(firstError(journey)).toBe('steps:tooFew');
    journey.steps = Array.from({ length: 9 }, (_, index) => ({ ...valid().steps[0]!, id: `s-${index}` }));
    expect(firstError(journey)).toBe('steps:tooMany');
  });

  it('allows up to four benefits per step', () => {
    const journey = valid();
    journey.steps[0]!.bullets = Array.from({ length: 5 }, (_, index) => ({
      id: `b-${index}`,
      text: { mk: 'x' },
    }));
    expect(firstError(journey)).toBe('steps.0.bullets:tooMany');
  });

  it('needs alt text for a photo, and both quote and author for a quote', () => {
    const journey = valid();
    journey.steps[0]!.photo = { mediaId: 'media-journey-meeting', alt: { mk: '' } };
    expect(firstError(journey)).toBe('steps.0.photo.alt.mk:required');
    journey.steps[0]!.photo = null;
    journey.steps[0]!.quote = { text: { mk: 'A quote' }, author: { mk: '' } };
    expect(firstError(journey)).toBe('steps.0.quote.author.mk:required');
  });

  it('takes links to this site or https, nothing else', () => {
    const journey = valid();
    journey.steps[0]!.button.href = 'javascript:alert(1)';
    expect(firstError(journey)).toBe('steps.0.button.href:url');
    journey.steps[0]!.button.href = '/members#teams';
    expect(firstError(journey)).toBeNull();
  });
});
