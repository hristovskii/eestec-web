import type {
  ActiveMembers,
  ActiveMembersQuery,
  AlumniList,
  AlumniQuery,
  Audience,
  BoardView,
  ProfileResult,
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
}
