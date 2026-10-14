import { describe, expect, it } from 'vitest';

import { alternatesFor, localizedPath, openGraphLocales } from './alternates';

describe('localizedPath', () => {
  it('leaves Macedonian unprefixed and puts English under /en', () => {
    expect(localizedPath('/events', 'mk')).toBe('/events');
    expect(localizedPath('/events', 'en')).toBe('/en/events');
  });

  it('knows the home page and ignores a trailing slash', () => {
    expect(localizedPath('/', 'mk')).toBe('/');
    expect(localizedPath('/', 'en')).toBe('/en');
    expect(localizedPath('/events/', 'en')).toBe('/en/events');
  });
});

describe('alternatesFor', () => {
  it('points the canonical at the page in its own language and lists both, Macedonian as default', () => {
    expect(alternatesFor('/contact', 'en')).toEqual({
      canonical: '/en/contact',
      languages: { mk: '/contact', en: '/en/contact', 'x-default': '/contact' },
    });
    expect(alternatesFor('/', 'mk').canonical).toBe('/');
  });
});

describe('openGraphLocales', () => {
  it('names the page language and the other one', () => {
    expect(openGraphLocales('mk')).toEqual({ locale: 'mk_MK', alternateLocale: ['en_US'] });
    expect(openGraphLocales('en')).toEqual({ locale: 'en_US', alternateLocale: ['mk_MK'] });
  });
});
