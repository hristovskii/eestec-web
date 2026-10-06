import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

import { hasSessionCookie } from '@/features/auth';
import { resolveEventAddress } from '@/features/events/server';
import { routing } from '@/shared/i18n/routing';

const intl = createIntlMiddleware(routing);

const isUnder = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

// One proxy per request (docs/ARCHITECTURE.md §1.3):
// - /admin and /api: no locale routing. Supabase session refresh goes here in the backend phase.
// - everything else: next-intl locale routing (MK unprefixed, EN under /en).
//   Scoped lookups for /events/:slug and /upcoming/:slug only (decided rules): old addresses and
//   ended upcoming events are a 301; an event that hasn't ended lives under /upcoming (307, it
//   moves to /events by itself later).
const EVENT_PATH = /^(\/en)?\/(events|upcoming)\/([a-z0-9-]+)\/?$/;

async function eventRedirect(request: NextRequest, match: RegExpExecArray) {
  const [, prefix = '', section, slug] = match;
  const address = await resolveEventAddress(slug!);
  if (!address) return null;
  const home = address.timing === 'upcoming' ? 'upcoming' : 'events';
  if (address.slug === slug && home === section) return null;
  // A new address or an ended event is permanent; "not in the archive yet" is not.
  const permanent = address.slug !== slug || home === 'events';
  const url = new URL(`${prefix}/${home}/${address.slug}`, request.url);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url, permanent ? 301 : 307);
}

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
    const redirect = await eventRedirect(request, event);
    if (redirect) return redirect;
  }
  return intl(request);
}

export const config = {
  // Skip Next internals and anything with a file extension.
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
