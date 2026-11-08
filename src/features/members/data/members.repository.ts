import type { Paged } from '@/shared/data/paged';

import type {
  ActiveMembers,
  AdminMemberCounts,
  AdminMembersQuery,
  ActiveMembersQuery,
  AlumniList,
  AlumniQuery,
  Audience,
  Badge,
  BadgeInput,
  BadgeWithCount,
  BoardMandate,
  BoardPerson,
  BoardView,
  ConsentPatch,
  MemberConsents,
  MineContext,
  MineView,
  ProfileVisibility,
  SelfEdit,
  StoreCvResult,
  UpdateMineResult,
  MandateInput,
  Profile,
  ProfileEdit,
  ProfileResult,
  RemoveBadgeResult,
  RemoveMandateResult,
  RemoveTeamResult,
  SaveBadgeResult,
  SaveMandateResult,
  SaveProfileResult,
  SaveSeatResult,
  SaveTeamResult,
  SeatInput,
  Team,
  TeamInput,
  TeamWithCount,
} from '../types';

/**
 * Members (data-model.md: profiles, teams, badges, board). Every public read takes the audience and
 * applies the visibility rule itself (the stand-in for row-level security); the admin methods
 * (M15d, M15e) are for callers that have checked the permission.
 */
export interface MembersRepository {
  /** Active members the audience may see: filtered, sorted, paged, with the numbers for the chips. */
  listActive(audience: Audience, query: ActiveMembersQuery, currentYear: number): Promise<ActiveMembers>;
  listAlumni(audience: Audience, query: AlumniQuery): Promise<AlumniList>;
  /** The boards (current first), and one board's seats; a label that does not exist → the current board. */
  getBoard(label?: string): Promise<BoardView>;
  /** null: no such page for this viewer (unknown, hidden, inactive). */
  getProfile(audience: Audience, username: string, currentYear: number): Promise<ProfileResult | null>;
  /** Usernames of every profile that is public, for the sitemap. */
  listPublicUsernames(): Promise<string[]>;

  // Admin › Members (callers check the permission; every status is visible here).
  /** Every profile, filtered, sorted and paged; the tab counts ignore the status tab. */
  adminList(query: AdminMembersQuery): Promise<Paged<Profile> & { counts: AdminMemberCounts; teams: Team[] }>;
  /** The teams and badges the board can give. */
  getCatalog(): Promise<{ teams: Team[]; badges: Badge[] }>;
  /**
   * Replaces what the board edits on a profile. Unknown teams and badges are ignored; a badge keeps
   * its award date, a new one gets `now`. A person the board approved but never edited gets a
   * stored profile from this first save.
   */
  saveProfile(userId: string, edit: ProfileEdit, now: Date): Promise<SaveProfileResult>;

  // Admin › Teams
  /** Every team in its order, with the number of people in it. */
  adminTeams(): Promise<TeamWithCount[]>;
  /** Creates (no id) or renames a team. Names are unique; the address (slug) is made once and kept. */
  saveTeam(input: TeamInput, id?: string): Promise<SaveTeamResult>;
  removeTeam(id: string): Promise<RemoveTeamResult>;
  /** Puts the teams in this order (ids not listed keep their place after the listed ones). */
  reorderTeams(ids: readonly string[]): Promise<void>;

  // Admin › Badges
  adminBadges(): Promise<BadgeWithCount[]>;
  saveBadge(input: BadgeInput, id?: string): Promise<SaveBadgeResult>;
  removeBadge(id: string): Promise<RemoveBadgeResult>;

  // Admin › Board
  /** Every board (current first, then newest), and the people a seat can go to. */
  adminBoards(): Promise<{ mandates: BoardMandate[]; people: BoardPerson[] }>;
  /**
   * Creates (no id) or edits a board. Labels are unique. Exactly one board is current: marking one
   * moves it, the first board is current, and the current one can't be unmarked (mark another).
   */
  saveMandate(input: MandateInput, id?: string): Promise<SaveMandateResult>;
  removeMandate(id: string): Promise<RemoveMandateResult>;
  /** Adds (no seatId) or changes a seat; a new seat goes last. */
  saveSeat(mandateId: string, input: SeatInput, seatId?: string): Promise<SaveSeatResult>;
  removeSeat(mandateId: string, seatId: string): Promise<boolean>;
  reorderSeats(mandateId: string, seatIds: readonly string[]): Promise<void>;

  // My profile (M16): the signed-in member's own data. Callers have checked who is signed in, and
  // pass who that person is in `auth`. A person waiting for the board has no profile yet: what they
  // write is kept as a draft that becomes the profile when the board approves them.
  getMine(who: MineContext, year: number): Promise<MineView>;
  /** Is this address free for this person? (Other profiles, stored or approved but not stored yet.) */
  usernameAvailable(userId: string, username: string): Promise<boolean>;
  updateMine(who: MineContext, edit: SelfEdit): Promise<UpdateMineResult>;
  setVisibility(who: MineContext, visibility: ProfileVisibility): Promise<void>;
  /** A new photo address (null removes the photo). Returns the address the old photo had, to delete its file. */
  setPhoto(who: MineContext, photoUrl: string | null): Promise<string | null>;
  /**
   * Turning CV sharing on records when; turning it off deletes the CV file (decided: partners lose
   * access at once). E-mails and gallery names are plain choices.
   */
  setConsents(userId: string, patch: ConsentPatch, now: Date): Promise<MemberConsents>;
  /** Replaces the CV file; only while CV sharing is on. */
  storeCv(userId: string, file: { fileName: string; bytes: Uint8Array }, now: Date): Promise<StoreCvResult>;
  /** Deletes the CV file and leaves sharing on (the upload box comes back). */
  removeCv(userId: string): Promise<boolean>;
  /** The CV with its content (null content: the sample file has none), for "Download my data". */
  getCvFile(userId: string): Promise<{ fileName: string; size: number; bytes: Uint8Array | null } | null>;
  /** Deleting the account: the profile or draft, choices and CV go; seats on a board are given up. */
  deleteMine(userId: string): Promise<{ photoUrl: string | null }>;
}
