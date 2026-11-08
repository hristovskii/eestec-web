import 'server-only';

import type { AccountDetails, Session } from '@/features/auth';
import { getAccountDetails, getMemberRegistration, photoUrl } from '@/features/auth/server';
import { countMyPublishedMemories } from '@/features/memories/server';
import { getSiteSettings } from '@/features/settings/server';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';
import { initials } from '@/shared/lib/initials';
import { now } from '@/shared/lib/now';
import { relativeAge } from '@/shared/lib/relative-age';

import { membersRepository } from './data';
import { type SignUpFacts, toMineContext } from './domain/mine-context';
import { memberRole } from './domain/member-role';
import type { MineContext, MineView, MyProfileView } from './types';

// "My profile" (/profile): the signed-in member's own data. It depends on who is signed in, so
// nothing here is cached. The caller has checked the session (requireMember / currentMember).

/** Who the member is for the repository: the session plus what they gave at sign-up. */
export async function getMineContext(session: Session): Promise<MineContext> {
  const registration = await getMemberRegistration(session.userId);
  const signUp: SignUpFacts | null = registration
    ? {
        faculty: registration.faculty,
        visibility: registration.visibility,
        photoUrl: registration.photoId ? photoUrl(registration.photoId) : null,
        since: registration.decidedAt ?? registration.submittedAt,
      }
    : null;
  return toMineContext(session, signUp, now().toISOString());
}

export type MyProfileData = { context: MineContext; mine: MineView; details: AccountDetails };

/** Everything /profile shows about the member except applications (those come from `applications`). */
export async function getMyProfile(session: Session): Promise<MyProfileData | null> {
  const context = await getMineContext(session);
  const [mine, details] = await Promise.all([
    (await membersRepository('session')).getMine(context, now().getFullYear()),
    getAccountDetails(session.userId),
  ]);
  return details ? { context, mine, details } : null;
}

/** The Profile and Visibility parts of /profile in the language of the page. */
export async function getMyProfileView(session: Session, locale: Locale): Promise<MyProfileView | null> {
  const data = await getMyProfile(session);
  if (!data) return null;
  const { mine, details } = data;
  const { profile } = mine;
  const [catalog, settings, memoriesPublished] = await Promise.all([
    (await membersRepository('session')).getCatalog(),
    getSiteSettings(locale),
    countMyPublishedMemories(session.userId),
  ]);
  const teams = profile.teams.flatMap((entry) => {
    const team = catalog.teams.find((item) => item.id === entry.teamId);
    return team ? [resolveLocalized(team.name, locale)] : [];
  });
  return {
    pending: mine.pending,
    email: details.email,
    name: profile.name,
    initials: initials(profile.name),
    username: profile.username,
    photo: profile.photo,
    visibility: profile.visibility,
    values: {
      name: profile.name,
      username: profile.username,
      bio: profile.bio,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      faculty: profile.faculty,
      phone: details.phone,
      year: details.year ?? '',
    },
    board: {
      teams,
      role: memberRole(profile.teams, profile.memberSince, now().getFullYear()),
      since: profile.memberSince,
      badges: profile.badges.length,
      email: settings.boardRoles.find((role) => role.id === 'role-members')?.email ?? null,
    },
    account: {
      passwordChangedAt: details.passwordChangedAt,
      passwordAge: details.passwordChangedAt
        ? relativeAge(details.passwordChangedAt, now().toISOString())
        : null,
      memoriesPublished,
    },
    privacy: {
      dataConsentAt: details.dataConsentAt,
      consents: mine.consents,
      cv: mine.cv,
      cvViewsThisYear: mine.cvViewsThisYear,
    },
  };
}
