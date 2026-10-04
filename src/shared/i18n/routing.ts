import { defineRouting } from 'next-intl/routing';

// Macedonian is the default and unprefixed; English lives under /en (docs/ARCHITECTURE.md §7).
export const routing = defineRouting({
  locales: ['mk', 'en'],
  defaultLocale: 'mk',
  localePrefix: 'as-needed',
  // The URL is the only language state: no Accept-Language redirects, no cookie.
  localeDetection: false,
  localeCookie: false,
});

export type Locale = (typeof routing.locales)[number];
