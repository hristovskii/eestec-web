import type { Localized } from '@/shared/types/localized';

// Members (data-model.md: profiles, teams / member_teams, badges / member_badges, board_mandates /
// board_members). Registrations and accounts stay in `auth`; a profile exists once the board has
// approved a person, so `pending` and `rejected` are not statuses here.

/** active: in the Active members grid; alumni: in Alumni; inactive and hidden: never public. */
export const PROFILE_STATUSES = ['active', 'alumni', 'inactive', 'hidden'] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

/** Default for new accounts is members_only. */
export const PROFILE_VISIBILITIES = ['public', 'members_only'] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export const TEAM_ROLES = ['member', 'lead', 'trainer'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const EVENT_ROLES = ['organizer', 'participant'] as const;
export type EventRole = (typeof EVENT_ROLES)[number];

/** The icons a badge can wear (a fixed list: no uploads). */
export const BADGE_ICONS = [
  'calendar-check',
  'globe',
  'users',
  'landmark',
  'presentation',
  'award',
  'star',
  'heart',
] as const;
export type BadgeIcon = (typeof BADGE_ICONS)[number];

/** Who is looking: decides which profiles exist for them (the stand-in for row-level security). */
export type Audience = 'visitor' | 'member';

/** `src: null` is a photo that exists but has no file in the sample data: shown as the placeholder. */
export type ProfilePhoto = { src: string | null };

export type ProfileTeam = { teamId: string; role: TeamRole };
export type ProfileBadge = { badgeId: string; note: string; awardedAt: string };
export type ProfileEvent = { eventId: string; role: EventRole };

/** Stored profile. Never holds e-mail or phone (those stay in `auth`). */
export type Profile = {
  userId: string;
  /** Unique address of the profile: /members/<username>. */
  username: string;
  name: string;
  photo: ProfilePhoto | null;
  /** Moderation: the board can hide a photo or a bio without hiding the person. */
  hidePhoto: boolean;
  bio: string;
  hideBio: boolean;
  linkedinUrl: string;
  githubUrl: string;
  visibility: ProfileVisibility;
  status: ProfileStatus;
  /** ISO date. */
  memberSince: string;
  /** ISO date, alumni only. */
  activeTo: string | null;
  /** Alumni: what they do now / what they are remembered for. */
  alumniNow: Localized | null;
  alumniHighlight: Localized | null;
  faculty: string;
  teams: ProfileTeam[];
  badges: ProfileBadge[];
  events: ProfileEvent[];
};

export type Team = { id: string; slug: string; name: Localized; sortOrder: number };
export type Badge = { id: string; name: Localized; description: Localized; icon: BadgeIcon };

/** One seat of a board. `title` is what the Members page shows (kept as written, even if the role is renamed later). */
export type BoardSeat = { id: string; boardRoleId: string; title: string; userId: string };
export type BoardMandate = {
  id: string;
  /** "2026/2027". */
  label: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  seats: BoardSeat[];
};

/** Role line of a card. "new": joined this year. */
export type MemberRoleKey = 'lead' | 'trainer' | 'member' | 'new';

/** A person as a list shows them (languages not resolved yet). */
export type MemberSummary = {
  userId: string;
  username: string;
  name: string;
  /** null: no photo, initials; src null inside: placeholder picture. */
  photo: ProfilePhoto | null;
  teams: Team[];
  role: MemberRoleKey;
  memberSince: string;
  /** Visible to members only: the card shows the lock pill (members see it, visitors never get the row). */
  membersOnly: boolean;
};

export type AlumniSummary = {
  userId: string;
  username: string;
  name: string;
  memberSince: string;
  activeTo: string | null;
  now: Localized | null;
  highlight: Localized | null;
};

export type BoardSeatView = {
  seatId: string;
  boardRoleId: string;
  title: string;
  name: string;
  /** null: the person has no (visible) profile page. */
  username: string | null;
  photo: ProfilePhoto | null;
};

export type BoardView = {
  /** Newest first. */
  mandates: { id: string; label: string; isCurrent: boolean }[];
  selected: { id: string; label: string; isCurrent: boolean; seats: BoardSeatView[] } | null;
};

export const MEMBER_SORTS = ['name', 'newest', 'longest'] as const;
export type MemberSort = (typeof MEMBER_SORTS)[number];

export type ActiveMembersQuery = {
  /** Name contains. */
  q?: string;
  /** Team slug. */
  team?: string;
  /** Joined in this year; with `orEarlier`: in this year or before. */
  joined?: { year: number; orEarlier: boolean };
  sort: MemberSort;
  page: number;
  pageSize: number;
};

export type ActiveMembers = {
  items: MemberSummary[];
  total: number;
  page: number;
  pageCount: number;
  /** Per team, counting the people who match the search and the joined year (not the team filter). */
  teamCounts: { team: Team; count: number }[];
  /** Everyone matching search and year, whatever the team. */
  allCount: number;
  /** Every active member the audience may see, whatever the filters (the jump link's number). */
  visibleTotal: number;
  /** Active members-only profiles a visitor cannot see (0 for members). */
  hiddenCount: number;
  /** Teams of the whole club, for the chips. */
  teams: Team[];
};

export type AlumniQuery = { q?: string; limit: number | 'all' };
export type AlumniList = { items: AlumniSummary[]; total: number; matching: number };

/** What /members/<username> may show the viewer. */
export type ProfileResult =
  | {
      kind: 'full';
      profile: Profile;
      teams: { team: Team; role: TeamRole }[];
      badges: { badge: Badge; note: string; awardedAt: string }[];
      role: MemberRoleKey;
    }
  | {
      kind: 'restricted';
      userId: string;
      username: string;
      name: string;
      teams: Team[];
      memberSince: string;
    };

// ─── What the pages receive: languages resolved, ready to draw ───

export type MemberCardData = {
  username: string;
  name: string;
  initials: string;
  photo: ProfilePhoto | null;
  /** Team names in the language of the page. */
  teams: string[];
  role: MemberRoleKey;
  since: number;
  membersOnly: boolean;
};

export type BoardCardData = {
  name: string;
  initials: string;
  /** null: no page to link to. */
  username: string | null;
  position: string;
  /** Position e-mail: current board only. */
  email: string | null;
  photo: ProfilePhoto | null;
};

export type AlumniCardData = {
  username: string;
  name: string;
  initials: string;
  /** "2018–2023". */
  years: string;
  highlight: string;
  now: string;
};

export type TeamChip = { slug: string; name: string; count: number };

export type ActiveMembersView = {
  items: MemberCardData[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  allCount: number;
  visibleTotal: number;
  hiddenCount: number;
  teams: TeamChip[];
};

export type BoardPageView = {
  mandates: { label: string; isCurrent: boolean }[];
  selected: { label: string; isCurrent: boolean; cards: BoardCardData[] } | null;
};

export type AlumniView = { items: AlumniCardData[]; total: number; matching: number };

/** One event on a profile, already in the language of the page. */
export type ProfileEventView = {
  id: string;
  title: string;
  /** The language the title is in (an English page falls back to Macedonian per field). */
  lang: 'mk' | 'en';
  startsAt: string;
  typeName: string;
  scope: 'local' | 'international';
  place: string;
  timing: 'upcoming' | 'past';
  role: EventRole;
  /** /upcoming/<slug> until it ends, then /events/<slug>. */
  path: string;
};

export type ProfileBadgeView = {
  id: string;
  name: string;
  /** What the badge was awarded for ("Helped organize 3 events"); falls back to what the badge means. */
  text: string;
  icon: BadgeIcon;
};

export type ProfilePageView =
  | {
      kind: 'full';
      username: string;
      name: string;
      initials: string;
      photo: ProfilePhoto | null;
      status: 'active' | 'alumni';
      visibility: ProfileVisibility;
      teams: { slug: string; name: string; role: TeamRole }[];
      role: MemberRoleKey;
      memberSince: string;
      since: number;
      /** Alumni: "2018–2023". */
      activeYears: string | null;
      alumniNow: string;
      alumniHighlight: string;
      bio: string;
      linkedinUrl: string;
      githubUrl: string;
      badges: ProfileBadgeView[];
      events: ProfileEventView[];
      counts: { attended: number; organized: number };
    }
  | {
      kind: 'restricted';
      username: string;
      name: string;
      initials: string;
      teams: string[];
      memberSince: string;
    };
