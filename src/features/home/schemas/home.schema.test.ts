import { describe, expect, it } from 'vitest';

import { homeFixture } from '../data/fixtures/home';
import { homeInputSchema } from './home.schema';

const valid = () => structuredClone(homeFixture);
const firstError = (input: unknown) => {
  const result = homeInputSchema.safeParse(input);
  return result.success
    ? null
    : `${result.error.issues[0]!.path.join('.')}:${result.error.issues[0]!.message}`;
};

describe('homeInputSchema', () => {
  it('accepts the sample content', () => {
    expect(homeInputSchema.safeParse(valid()).success).toBe(true);
  });

  it('needs the Macedonian headline, but not an English one', () => {
    const home = valid();
    home.hero.headline = { mk: '  ' };
    expect(firstError(home)).toBe('hero.headline.mk:required');
    home.hero.headline = { mk: 'Здраво' };
    expect(firstError(home)).toBeNull();
  });

  it('takes links to this site or https, nothing else', () => {
    const ok = ['/join', '/upcoming?type=workshop', 'https://eestec.net'];
    const bad = ['join', '//evil.example', 'http://eestec.net', 'javascript:alert(1)', ''];
    for (const href of ok) {
      const home = valid();
      home.hero.primary.href = href;
      expect(firstError(home), href).toBeNull();
    }
    for (const href of bad) {
      const home = valid();
      home.hero.primary.href = href;
      expect(firstError(home), href).toMatch(/^hero\.primary\.href:(url|required)$/);
    }
  });

  it('needs alt text (Macedonian) for every photo it uses', () => {
    const home = valid();
    home.milestones[0]!.photo = { mediaId: 'media-home-robomac', alt: { mk: '' } };
    expect(firstError(home)).toBe('milestones.0.photo.alt.mk:required');
  });

  it('checks the year and the numbers', () => {
    const home = valid();
    home.milestones[0]!.year = 1850;
    expect(firstError(home)).toBe('milestones.0.year:range');
    home.milestones[0]!.year = Number.NaN;
    expect(firstError(home)).toBe('milestones.0.year:number');
    home.milestones[0]!.year = 2005;
    home.stats[0]!.value = 1.5;
    expect(firstError(home)).toBe('stats.0.value:number');
    home.stats[0]!.value = -1;
    expect(firstError(home)).toBe('stats.0.value:range');
  });

  it('limits how many cards, milestones and numbers there are', () => {
    const home = valid();
    home.stats = Array.from({ length: 7 }, (_, index) => ({ ...home.stats[0]!, id: `st-${index}` }));
    expect(firstError(home)).toBe('stats:tooMany');
  });

  it('wants every section exactly once in the layout', () => {
    const home = valid();
    home.layout = home.layout.slice(1);
    expect(firstError(home)).toBe('layout:layout');
    home.layout = [...valid().layout.slice(1), { key: 'map', visible: true }];
    expect(firstError(home)).toBe('layout:layout');
  });
});
