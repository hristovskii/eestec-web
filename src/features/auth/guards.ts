import 'server-only';

// Admin guards. `redirect` from next/navigation on purpose: /admin has no locale.
// eslint-disable-next-line no-restricted-imports
import { redirect } from 'next/navigation';

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
