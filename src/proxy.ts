import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

import { hasSessionCookie } from '@/features/auth';
import { findEventRedirect } from '@/features/events/server';
import { routing } from '@/shared/i18n/routing';

const intl = createIntlMiddleware(routing);

const isUnder = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

// One proxy per request (docs/ARCHITECTURE.md §1.3):
// - /admin and /api: no locale routing. Supabase session refresh goes here in the backend phase.
// - everything else: next-intl locale routing (MK unprefixed, EN under /en).
//   Scoped 301 lookup for old event addresses (/events/:slug); ended /upcoming/:slug in M7.
const EVENT_PATH = /^(\/en)?\/events\/([a-z0-9-]+)\/?$/;

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isUnder(pathname, '/admin')) {
    // Visitors without any session go straight to sign-in (a real 307, before rendering).
    const signedIn = hasSessionCookie(request.cookies.getAll().map((cookie) => cookie.name));
    if (!signedIn && !isUnder(pathname, '/admin/login')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }
  if (isUnder(pathname, '/api')) return NextResponse.next();
  const event = EVENT_PATH.exec(pathname);
  if (event) {
    const current = await findEventRedirect(event[2]!);
    if (current)
      return NextResponse.redirect(new URL(`${event[1] ?? ''}/events/${current}`, request.url), 301);
  }
  return intl(request);
}

export const config = {
  // Skip Next internals and anything with a file extension.
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
