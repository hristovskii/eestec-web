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
  BoardView,
  Profile,
  ProfileEdit,
  ProfileResult,
  SaveProfileResult,
  Team,
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
}
