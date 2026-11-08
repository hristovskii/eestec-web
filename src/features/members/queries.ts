import 'server-only';

import { getSession } from '@/features/auth/server';
import { getSiteSettings } from '@/features/settings/server';
import type { Locale } from '@/shared/i18n/routing';
import { now } from '@/shared/lib/now';

import { membersRepository } from './data';
import { toActiveView, toAlumniView, toBoardView } from './domain/view';
import type { ActiveMembersQuery, Audience, ProfileResult } from './types';

// Member reads depend on who is looking, so they are not cached: the pages read the session anyway.
// The audience is always derived from the session here, never from the address.

/** Signed-in members (and the board) see members-only profiles; visitors and pending members do not. Reads cookies: dynamic. */
export async function getAudience(): Promise<Audience> {
  const session = await getSession();
  if (!session) return 'visitor';
  const isMember = session.memberStatus === 'active' || session.memberStatus === 'alumni';
  return isMember || session.adminRole ? 'member' : 'visitor';
}

const currentYear = () => now().getUTCFullYear();

export async function listActiveMembers(audience: Audience, locale: Locale, query: ActiveMembersQuery) {
  const result = await (await membersRepository()).listActive(audience, query, currentYear());
  return toActiveView(result, query.pageSize, locale);
}

export async function listAlumni(
  audience: Audience,
  locale: Locale,
  query: { q?: string; all: boolean },
  limit = 9,
) {
  const result = await (
    await membersRepository()
  ).listAlumni(audience, {
    q: query.q,
    limit: query.all ? 'all' : limit,
  });
  return toAlumniView(result, locale);
}

/** One board with its position e-mails (current board only). `label` picks a board; none → the current one. */
export async function getBoard(locale: Locale, label?: string) {
  const [view, settings] = await Promise.all([
    (await membersRepository()).getBoard(label),
    getSiteSettings(locale),
  ]);
  return toBoardView(view, (roleId) => settings.boardRoles.find((role) => role.id === roleId)?.email);
}

/** What /members/<username> may show this viewer; null: 404. */
export async function getProfile(audience: Audience, username: string): Promise<ProfileResult | null> {
  return (await membersRepository()).getProfile(audience, username, currentYear());
}

/** Usernames of public profiles (sitemap). */
export async function listPublicUsernames() {
  return (await membersRepository()).listPublicUsernames();
}
