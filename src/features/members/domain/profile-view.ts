import { resolveLocalized } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';
import { initials } from '@/shared/lib/initials';

import type { EventRole, ProfilePageView, ProfileEventView, ProfileResult } from '../types';
import { activeYears } from './view';
import { yearOf } from './member-role';

/** The events of the board's list that exist for visitors (listed), as the events feature gives them. */
export type EventForProfile = {
  id: string;
  slug: string;
  title: { text: string; lang: Locale };
  startsAt: string;
  typeName: string;
  scope: 'local' | 'international';
  place: { text: string };
  timing: 'upcoming' | 'past';
};

export const eventPath = (event: Pick<EventForProfile, 'slug' | 'timing'>) =>
  `/${event.timing === 'upcoming' ? 'upcoming' : 'events'}/${event.slug}`;

export function toProfileView(
  result: ProfileResult,
  events: readonly EventForProfile[],
  locale: Locale,
): ProfilePageView {
  if (result.kind === 'restricted') {
    return {
      kind: 'restricted',
      username: result.username,
      name: result.name,
      initials: initials(result.name),
      teams: result.teams.map((team) => resolveLocalized(team.name, locale)),
      memberSince: result.memberSince,
    };
  }
  const { profile } = result;
  const roleOf = new Map<string, EventRole>(profile.events.map((entry) => [entry.eventId, entry.role]));
  const eventViews = events.flatMap((event): ProfileEventView[] => {
    const role = roleOf.get(event.id);
    if (!role) return [];
    return [
      {
        id: event.id,
        title: event.title.text,
        lang: event.title.lang,
        startsAt: event.startsAt,
        typeName: event.typeName,
        scope: event.scope,
        place: event.place.text,
        timing: event.timing,
        role,
        path: eventPath(event),
      },
    ];
  });
  return {
    kind: 'full',
    username: profile.username,
    name: profile.name,
    initials: initials(profile.name),
    photo: profile.photo,
    status: profile.status === 'alumni' ? 'alumni' : 'active',
    visibility: profile.visibility,
    teams: result.teams.map(({ team, role }) => ({
      slug: team.slug,
      name: resolveLocalized(team.name, locale),
      role,
    })),
    role: result.role,
    memberSince: profile.memberSince,
    since: yearOf(profile.memberSince),
    activeYears: profile.status === 'alumni' ? activeYears(profile.memberSince, profile.activeTo) : null,
    alumniNow: profile.alumniNow ? resolveLocalized(profile.alumniNow, locale) : '',
    alumniHighlight: profile.alumniHighlight ? resolveLocalized(profile.alumniHighlight, locale) : '',
    bio: profile.bio,
    linkedinUrl: profile.linkedinUrl,
    githubUrl: profile.githubUrl,
    badges: result.badges.map(({ badge, note }) => ({
      id: badge.id,
      name: resolveLocalized(badge.name, locale),
      text: note || resolveLocalized(badge.description, locale),
      icon: badge.icon,
    })),
    events: eventViews,
    counts: {
      attended: eventViews.filter((event) => event.role === 'participant').length,
      organized: eventViews.filter((event) => event.role === 'organizer').length,
    },
  };
}
