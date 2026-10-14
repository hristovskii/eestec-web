import type { Metadata } from 'next';

import { type Locale, routing } from '@/shared/i18n/routing';

type Alternates = NonNullable<Metadata['alternates']>;

/** The address of a page in one language: Macedonian is unprefixed, English lives under /en. */
export function localizedPath(path: string, locale: Locale): string {
  const clean = path === '/' ? '' : path.replace(/\/$/, '');
  if (locale === routing.defaultLocale) return clean || '/';
  return `/${locale}${clean}`;
}

/**
 * Canonical address and hreflang links of a page. Macedonian is also `x-default` (it is the site's
 * default language). The addresses are relative: `metadataBase` makes them absolute.
 */
export function alternatesFor(path: string, locale: Locale): Alternates {
  return {
    canonical: localizedPath(path, locale),
    languages: {
      ...Object.fromEntries(routing.locales.map((code) => [code, localizedPath(path, code)])),
      'x-default': localizedPath(path, routing.defaultLocale),
    },
  };
}

const OG_LOCALES: Record<Locale, string> = { mk: 'mk_MK', en: 'en_US' };

/** `og:locale` and `og:locale:alternate` for a page in `locale`. */
export function openGraphLocales(locale: Locale): { locale: string; alternateLocale: string[] } {
  return {
    locale: OG_LOCALES[locale],
    alternateLocale: routing.locales.filter((code) => code !== locale).map((code) => OG_LOCALES[code]),
  };
}
