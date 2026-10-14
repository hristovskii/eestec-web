import { describe, expect, it } from 'vitest';

import { COUNTRY_CODES, countryFromText, countryName } from './country';

describe('countries', () => {
  it('names a country in the language of the page', () => {
    expect(countryName('MK', 'en')).toBe('North Macedonia');
    expect(countryName('MK', 'mk')).toBe('Северна Македонија');
    expect(countryName('TR', 'en')).toBe('Türkiye');
    expect(countryName('XK', 'en')).toBe('Kosovo');
    expect(countryName('ZZZ', 'en')).toBe('ZZZ');
  });

  it('names every country we offer, in both languages', () => {
    for (const code of COUNTRY_CODES)
      for (const locale of ['en', 'mk'] as const) expect(countryName(code, locale)).not.toBe(code);
  });

  it('reads codes and names, in either language, with or without accents', () => {
    expect(countryFromText('MK')).toBe('MK');
    expect(countryFromText(' mk ')).toBe('MK');
    expect(countryFromText('North Macedonia')).toBe('MK');
    expect(countryFromText('Северна Македонија')).toBe('MK');
    expect(countryFromText('Turkey')).toBe('TR');
    expect(countryFromText('Turkiye')).toBe('TR');
    expect(countryFromText('Bosnia and Herzegovina')).toBe('BA');
    expect(countryFromText('Czech Republic')).toBe('CZ');
    expect(countryFromText('Atlantis')).toBeNull();
    expect(countryFromText('')).toBeNull();
  });
});
