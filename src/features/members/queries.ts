import 'server-only';

import { getSession } from '@/features/auth/server';
import { getEventsByIds } from '@/features/events/server';
import { getSiteSettings } from '@/features/settings/server';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';
import { initials } from '@/shared/lib/initials';
import { now } from '@/shared/lib/now';

import { membersRepository } from './data';
import { toProfileView } from './domain/profile-view';
import { toActiveView, toAlumniView, toBoardView } from './domain/view';
import type { AdminMembersParams } from './schemas/admin-members-params.schema';
import type { ActiveMembersQuery, AuthorCardData, Audience, ProfilePageView, ProfileResult } from './types';

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

/** What /members/<username> shows this viewer, in the language of the page, events resolved; null: 404. */
export async function getProfilePage(
  audience: Audience,
  locale: Locale,
  username: string,
): Promise<ProfilePageView | null> {
  const result = await getProfile(audience, username);
  if (!result) return null;
  const ids = result.kind === 'full' ? result.profile.events.map((entry) => entry.eventId) : [];
  const events = ids.length > 0 ? await getEventsByIds(ids, locale) : [];
  return toProfileView(result, events, locale);
}

/** Usernames of public profiles (sitemap). */
export async function listPublicUsernames() {
  return (await membersRepository()).listPublicUsernames();
}

const toAdminQuery = (params: AdminMembersParams) => ({
  q: params.q,
  status: params.status,
  team: params.team,
  sort: params.sort ?? 'name',
  page: params.page,
  pageSize: params.size,
});

/** Admin › Members: one page of profiles (every status), the tab counts, and the teams and badges to give. Callers check the permission. */
export async function listAdminMembers(params: AdminMembersParams) {
  const repo = await membersRepository('session');
  const [page, catalog] = await Promise.all([repo.adminList(toAdminQuery(params)), repo.getCatalog()]);
  const { counts, teams: _teams, ...rows } = page;
  return { page: rows, counts, teams: catalog.teams, badges: catalog.badges };
}

/** Export CSV: every profile matching the filters (not just the page), with their teams. */
export async function exportAdminMembers(params: AdminMembersParams) {
  const repo = await membersRepository('session');
  const page = await repo.adminList({ ...toAdminQuery(params), page: 1, pageSize: 100_000 });
  return page.items.map((profile) => ({
    profile,
    teams: profile.teams.flatMap((entry) => page.teams.filter((team) => team.id === entry.teamId)),
  }));
}

/** Admin › Members › Teams / Badges: the lists with how many people have each. Callers check the permission. */
export async function listAdminTeams() {
  return (await membersRepository('session')).adminTeams();
}
export async function listAdminBadges() {
  return (await membersRepository('session')).adminBadges();
}

/** Admin › Members › Board: every board, who a seat can go to, and the position e-mails (Settings). */
export async function getAdminBoards() {
  const [boards, settings] = await Promise.all([
    (await membersRepository('session')).adminBoards(),
    getSiteSettings('en'),
  ]);
  return { ...boards, roles: settings.boardRoles };
}

/**
 * People as authors (Memories): name for everyone; the address, photo and bio only as far as this
 * viewer may see them. Keyed by user id; unknown ids are missing from the result.
 */
export async function getAuthorCards(
  audience: Audience,
  locale: Locale,
  userIds: readonly string[],
): Promise<Record<string, AuthorCardData>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return {};
  const found = await (await membersRepository()).findAuthors(audience, unique);
  return Object.fromEntries(
    found.map(({ profile, page, teams }) => [
      profile.userId,
      {
        name: profile.name,
        initials: initials(profile.name),
        username: page === 'none' ? null : profile.username,
        photo: page === 'full' && !profile.hidePhoto ? profile.photo : null,
        teams: teams.map((team) => resolveLocalized(team.name, locale)),
        since: Number(profile.memberSince.slice(0, 4)),
        bio: page === 'full' && !profile.hideBio ? profile.bio : '',
      } satisfies AuthorCardData,
    ]),
  );
}
