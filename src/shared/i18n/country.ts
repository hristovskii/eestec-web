import type { Locale } from './routing';

// Countries are stored as ISO 3166-1 codes and named by the browser / Node in the language of the
// page ("North Macedonia" / "Северна Македонија"), so no country text is ever written by hand.

/** The countries EESTEC committees are in (Europe and its neighbours), as codes. */
export const COUNTRY_CODES = [
  'AL',
  'AD',
  'AM',
  'AT',
  'AZ',
  'BY',
  'BE',
  'BA',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'GE',
  'DE',
  'GR',
  'HU',
  'IS',
  'IE',
  'IT',
  'XK',
  'LV',
  'LI',
  'LT',
  'LU',
  'MT',
  'MD',
  'MC',
  'ME',
  'NL',
  'MK',
  'NO',
  'PL',
  'PT',
  'RO',
  'RU',
  'SM',
  'RS',
  'SK',
  'SI',
  'ES',
  'SE',
  'CH',
  'TR',
  'UA',
  'GB',
  'VA',
] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const isCountryCode = (value: string): value is CountryCode =>
  (COUNTRY_CODES as readonly string[]).includes(value);

const names = new Map<Locale, Intl.DisplayNames>();
function displayNames(locale: Locale) {
  let formatter = names.get(locale);
  if (!formatter) {
    formatter = new Intl.DisplayNames([locale === 'mk' ? 'mk' : 'en-GB'], { type: 'region' });
    names.set(locale, formatter);
  }
  return formatter;
}

/** "North Macedonia" / "Северна Македонија". Unknown codes come back as they are. */
export function countryName(code: string, locale: Locale): string {
  try {
    return displayNames(locale).of(code) ?? code;
  } catch {
    return code;
  }
}

const norm = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .replaceAll('&', ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** A few names people type that aren't what ICU calls the country. */
const ALIASES: Record<string, CountryCode> = {
  turkey: 'TR',
  macedonia: 'MK',
  'republic of north macedonia': 'MK',
  uk: 'GB',
  'great britain': 'GB',
  england: 'GB',
  czechia: 'CZ',
  'czech republic': 'CZ',
  'bosnia herzegovina': 'BA',
  bosnia: 'BA',
  holland: 'NL',
  'the netherlands': 'NL',
  'russian federation': 'RU',
  'republic of moldova': 'MD',
};

let lookup: Map<string, CountryCode> | null = null;

/** "North Macedonia", "Türkiye", "МК" or "mk" → the code; null when it is not one of ours. */
export function countryFromText(text: string): CountryCode | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (isCountryCode(upper)) return upper;
  if (!lookup) {
    lookup = new Map();
    for (const code of COUNTRY_CODES)
      for (const locale of ['en', 'mk'] as const) lookup.set(norm(countryName(code, locale)), code);
  }
  const key = norm(trimmed);
  return lookup.get(key) ?? ALIASES[key] ?? null;
}
