import { describe, expect, it } from 'vitest';

import { SLUG_PATTERN, slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('makes readable addresses', () => {
    expect(slugify('Workshop: AI at the Edge')).toBe('workshop-ai-at-the-edge');
    expect(slugify('Exchange: Kraków Winter Edition')).toBe('exchange-krakow-winter-edition');
    expect(slugify('  R&D -- Day  ')).toBe('r-and-d-day');
  });

  it('transliterates Macedonian', () => {
    expect(slugify('Работилница: Вештачка интелигенција')).toBe('rabotilnica-veshtachka-inteligencija');
    expect(slugify('Ѓорѓи и Љубица')).toBe('gjorgji-i-ljubica');
  });

  it('always matches the slug pattern', () => {
    for (const text of ['Hands-on: FPGA Basics', 'EESTech Challenge 2027 — Local Round', 'x'.repeat(200)])
      expect(slugify(text)).toMatch(SLUG_PATTERN);
  });
});

describe('uniqueSlug', () => {
  it('adds a number when the address is taken', () => {
    const taken = new Set(['robomac', 'robomac-2']);
    expect(uniqueSlug('robomac', (slug) => taken.has(slug))).toBe('robomac-3');
    expect(uniqueSlug('new-year', (slug) => taken.has(slug))).toBe('new-year');
  });
});
