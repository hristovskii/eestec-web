import 'server-only';

import type { Route } from 'next';

// Admin guards. `redirect` from next/navigation on purpose: /admin has no locale.
// eslint-disable-next-line no-restricted-imports
import { redirect } from 'next/navigation';

import type { Locale } from '@/shared/i18n/routing';
import { localizedPath } from '@/shared/seo/alternates';

import { type Action, type AdminArea, can, isStaff, type Resource } from './domain/permissions';
import { getSession } from './queries';
import type { Session } from './types';

/** Signed-in admin, or a redirect to /admin/login. Reads cookies: call inside <Suspense>. */
export async function requireStaff(): Promise<Session> {
  const session = await getSession();
  if (!session || !isStaff(session)) redirect('/admin/login');
  return session;
}

/** requireStaff + the matrix (D18). Pages and every admin Server Action call this. */
export async function requirePermission(
  action: Action,
  area: AdminArea,
  resource?: Resource,
): Promise<Session> {
  const session = await requireStaff();
  if (!can(session, action, area, resource)) redirect('/admin?forbidden=1');
  return session;
}

/**
 * For Server Actions: the session when the matrix allows the action, otherwise null (the action
 * answers { ok: false, error: 'forbidden' } instead of redirecting).
 */
export async function authorize(
  action: Action,
  area: AdminArea,
  resource?: Resource,
): Promise<Session | null> {
  const session = await getSession();
  return session && can(session, action, area, resource) ? session : null;
}

/**
 * A signed-in member (any status: a person waiting for the board may finish their profile), or a
 * redirect to /login that brings them back to `next`. Board accounts without a member profile go
 * to the home page. Reads cookies: call inside <Suspense>.
 */
export async function requireMember(locale: Locale, next: string): Promise<Session> {
  const session = await getSession();
  // `next/navigation`'s redirect with the language in the path (the locale-aware helper would pull next-intl into every test that imports `auth`).
  if (!session)
    return redirect(`${localizedPath('/login', locale)}?next=${encodeURIComponent(next)}` as Route);
  if (!session.memberStatus) return redirect(localizedPath('/', locale) as Route);
  return session;
}

/** For Server Actions of /profile: the signed-in member's session, or null (the action answers `forbidden`). */
export async function currentMember(): Promise<Session | null> {
  const session = await getSession();
  return session?.memberStatus ? session : null;
}
