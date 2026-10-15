import { absoluteUrl, compact, type JsonLd } from '@/shared/seo/json-ld';

import type { SiteSettings } from './types';

/** schema.org `Organization` for the home page, from Settings. Empty fields are left out. */
export function organizationJsonLd(settings: SiteSettings, origin: string): JsonLd {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.siteName,
    legalName: settings.legal.fullName,
    url: origin,
    logo: absoluteUrl(origin, settings.branding.fullColor.src),
    email: settings.contact.mainEmail,
    address: settings.contact.address,
    sameAs: settings.socialLinks.map((link) => link.url),
  });
}
