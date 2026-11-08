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

// ─── Admin › Members ───

export const ADMIN_MEMBER_SORTS = ['name', '-name', 'since', '-since', 'status'] as const;
export type AdminMemberSort = (typeof ADMIN_MEMBER_SORTS)[number];

export type AdminMembersQuery = {
  /** Name or username contains. */
  q?: string;
  status?: ProfileStatus;
  /** Team slug. */
  team?: string;
  sort: AdminMemberSort;
  page: number;
  pageSize: number;
};

/** Per status for the tabs; the counts ignore the status tab but not the search and the team. */
export type AdminMemberCounts = Record<ProfileStatus | 'all', number>;

/** What the board edits on a profile (the member edits the rest themselves, in M16). */
export type ProfileEdit = {
  status: ProfileStatus;
  /** ISO date. */
  memberSince: string;
  /** ISO date; only alumni have one. */
  activeTo: string | null;
  teams: ProfileTeam[];
  badges: { badgeId: string; note: string }[];
  events: ProfileEvent[];
  alumniNow: Localized | null;
  alumniHighlight: Localized | null;
  hidePhoto: boolean;
  hideBio: boolean;
};

export type SaveProfileResult = { status: 'saved'; profile: Profile } | { status: 'not_found' };

// ─── Admin › Teams, Badges, Board ───

export type TeamInput = { name: Localized };
export type TeamWithCount = Team & { members: number };
export type SaveTeamResult =
  { status: 'saved'; team: Team } | { status: 'duplicate' } | { status: 'not_found' };
/** A team with people in it can't be deleted: take them out first. */
export type RemoveTeamResult =
  { status: 'removed' } | { status: 'in_use'; members: number } | { status: 'not_found' };

export type BadgeInput = { name: Localized; description: Localized; icon: BadgeIcon };
export type BadgeWithCount = Badge & { awarded: number };
export type SaveBadgeResult =
  { status: 'saved'; badge: Badge } | { status: 'duplicate' } | { status: 'not_found' };
/** Deleting a badge takes it from everyone who has it: `affected` says how many. */
export type RemoveBadgeResult = { status: 'removed'; affected: number } | { status: 'not_found' };

export type MandateInput = { label: string; startsOn: string; endsOn: string; isCurrent: boolean };
export type SaveMandateResult =
  { status: 'saved'; mandate: BoardMandate } | { status: 'duplicate' } | { status: 'not_found' };
/** The current board stays until another one is marked as current. */
export type RemoveMandateResult = { status: 'removed' } | { status: 'current' } | { status: 'not_found' };

export type SeatInput = { boardRoleId: string; title: string; userId: string };
export type SaveSeatResult =
  { status: 'saved'; mandate: BoardMandate } | { status: 'not_found' } | { status: 'person_not_found' };

/** Everyone a seat can go to (active members and alumni), by name. */
export type BoardPerson = { userId: string; name: string };

// ─── My profile (M16): what a member edits about themselves ───

/** Marketing and sharing choices. Everything is off until the member turns it on (data-model.md). */
export type MemberConsents = {
  /** E-mails about new events and calls (the jobs that send them come in M22). */
  newsletter: boolean;
  /** "Name me in event photo galleries". */
  galleryName: boolean;
  /** Share the CV with Main-package partners (D9: the board exports it; every export is logged). */
  cvOptIn: boolean;
  /** When CV sharing was turned on; null while it is off. */
  cvConsentAt: string | null;
};

/** The CV file as the member sees it (the file itself is private). */
export type CvInfo = { fileName: string; size: number; uploadedAt: string };

/**
 * Who the person is in `auth` (name, address, faculty, what they chose at sign-up, the sign-up
 * photo). A person the board has not approved yet has no profile, only a draft on top of this.
 */
export type MineContext = {
  userId: string;
  name: string;
  username: string;
  faculty: string;
  visibility: ProfileVisibility;
  /** Address of the sign-up photo; null: none. */
  photoUrl: string | null;
  /** ISO date: when the account was approved (or created, while it is pending). */
  since: string;
  /** Waiting for the board: edits go to the draft and nobody else can see the profile. */
  pending: boolean;
};

/** What a member edits on their own profile (phone and year stay in `auth`). */
export type SelfEdit = {
  name: string;
  username: string;
  bio: string;
  linkedinUrl: string;
  githubUrl: string;
  faculty: string;
};

export type MineView = {
  profile: Profile;
  pending: boolean;
  consents: MemberConsents;
  cv: CvInfo | null;
  /** Times partners' exports included the CV this year (the export log; empty until the admin export exists). */
  cvViewsThisYear: number;
};

export type UpdateMineResult =
  { status: 'saved'; profile: Profile } | { status: 'username_taken' } | { status: 'username_reserved' };

export type ConsentPatch = Partial<Pick<MemberConsents, 'newsletter' | 'galleryName' | 'cvOptIn'>>;

export type StoreCvResult = { status: 'stored'; cv: CvInfo } | { status: 'not_opted_in' };

/** What /profile draws, in the language of the page (the Profile and Visibility parts; later parts add their own). */
export type MyProfileView = {
  /** Waiting for the board: the profile is a draft nobody else sees. */
  pending: boolean;
  email: string;
  name: string;
  initials: string;
  /** The address of the profile page now. */
  username: string;
  photo: ProfilePhoto | null;
  visibility: ProfileVisibility;
  values: {
    name: string;
    username: string;
    bio: string;
    linkedinUrl: string;
    githubUrl: string;
    faculty: string;
    phone: string;
    /** '' when unknown. */
    year: string;
  };
  /** "Set by the board": read-only for the member. */
  board: {
    teams: string[];
    role: MemberRoleKey;
    /** ISO date. */
    since: string;
    badges: number;
    /** Where to write when something is wrong; null when the board has no such address. */
    email: string | null;
  };
  /** What the Account card needs. */
  account: {
    /** When the password was last changed (ISO); null when unknown. */
    passwordChangedAt: string | null;
    /** The same, as "n days / months / years ago" worked out on the server. */
    passwordAge: { count: number; unit: 'day' | 'month' | 'year' } | null;
    /** Published Memories ("Also delete my Memories (n published)"); always 0 until M17. */
    memoriesPublished: number;
  };
  /** Privacy & consent. */
  privacy: {
    /** When the account consent was given (sign-up). */
    dataConsentAt: string | null;
    consents: MemberConsents;
    cv: CvInfo | null;
    /** Times partners' exports included the CV this year; 0 hides the line. */
    cvViewsThisYear: number;
  };
};
