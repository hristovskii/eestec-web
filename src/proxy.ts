import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

import { routing } from '@/shared/i18n/routing';

const intl = createIntlMiddleware(routing);

const isUnder = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

// One proxy per request (docs/ARCHITECTURE.md §1.3):
// - /admin and /api: no locale routing. Supabase session refresh goes here in the backend phase.
// - everything else: next-intl locale routing (MK unprefixed, EN under /en).
//   Scoped 301 lookups for ended /upcoming/:slug and old event slugs arrive in M7.
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isUnder(pathname, '/admin') || isUnder(pathname, '/api')) return NextResponse.next();
  return intl(request);
}

export const config = {
  // Skip Next internals and anything with a file extension.
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
