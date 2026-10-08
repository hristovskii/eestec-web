import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { MAP_TILES_ORIGIN } from './src/shared/config/map';

const withNextIntl = createNextIntlPlugin('./src/shared/i18n/request.ts');

const isDev = process.env.NODE_ENV === 'development';

// Static CSP: a nonce-based CSP would make every page dynamic (no prerendered shells).
// Allowed third parties: map tiles (src/shared/config/map.ts), YouTube/Vimeo embeds, Cloudflare Turnstile.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${MAP_TILES_ORIGIN}`,
  "font-src 'self'",
  "connect-src 'self'",
  'frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://challenges.cloudflare.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  typedRoutes: true,
  poweredByHeader: false,
  // Don't let `next dev` write agent instructions into CLAUDE.md (we keep our own).
  agentRules: false,
  experimental: {
    // Application forms upload a CV of up to 5 MB with the answers (spec 03).
    serverActions: { bodySizeLimit: '6mb' },
  },
  cacheLife: {
    // Time-based states (deadline soon, just ended, upcoming → archive) refresh within 10 minutes (decided).
    events: { stale: 60, revalidate: 300, expire: 600 },
  },
  headers: () =>
    Promise.resolve([
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ]),
};

export default withNextIntl(nextConfig);
