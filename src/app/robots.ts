import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/shared/config/site';

// Everything public is open; the admin panel, the API and the component lab are not for search
// engines (the admin also sends `noindex`).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/design-system', '/en/design-system'],
    },
    sitemap: new URL('/sitemap.xml', SITE_URL).href,
  };
}
