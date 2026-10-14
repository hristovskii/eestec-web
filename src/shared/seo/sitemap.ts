import type { MetadataRoute } from 'next';

import { routing } from '@/shared/i18n/routing';

import { localizedPath } from './alternates';

/**
 * One entry per page and language, each listing both languages (hreflang), as search engines ask.
 * `origin` has no trailing slash; paths are the Macedonian ones ("/events", "/").
 */
export function buildSitemap(origin: string, paths: readonly string[]): MetadataRoute.Sitemap {
  const base = origin.replace(/\/$/, '');
  const url = (path: string, locale: (typeof routing.locales)[number]) => {
    const local = localizedPath(path, locale);
    return local === '/' ? `${base}/` : `${base}${local}`;
  };
  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: url(path, locale),
      alternates: {
        languages: Object.fromEntries(routing.locales.map((code) => [code, url(path, code)])),
      },
    })),
  );
}
