import { describe, expect, it } from 'vitest';

import { buildSitemap } from './sitemap';

describe('buildSitemap', () => {
  const sitemap = buildSitemap('https://eestec.mk/', ['/', '/events', '/upcoming/spring-camp']);

  it('has a Macedonian and an English entry for every page', () => {
    expect(sitemap.map((entry) => entry.url)).toEqual([
      'https://eestec.mk/',
      'https://eestec.mk/en',
      'https://eestec.mk/events',
      'https://eestec.mk/en/events',
      'https://eestec.mk/upcoming/spring-camp',
      'https://eestec.mk/en/upcoming/spring-camp',
    ]);
  });

  it('lists both languages on every entry', () => {
    expect(sitemap[3]?.alternates?.languages).toEqual({
      mk: 'https://eestec.mk/events',
      en: 'https://eestec.mk/en/events',
    });
  });

  it('never invents a modification date', () => {
    expect(sitemap.every((entry) => entry.lastModified === undefined)).toBe(true);
  });
});
