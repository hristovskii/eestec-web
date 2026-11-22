import 'server-only';

import { NotImplementedError, type RepoScope } from '@/shared/data/select-implementation';
import type { DbClient } from '@/shared/data/supabase/clients';
import type { Tables } from '@/shared/data/supabase/database.types';
import { isDataError, unwrap, unwrapMaybe, toDataError, DataError } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { toJson } from '@/shared/data/supabase/json';
import { mediaSource } from '@/shared/data/supabase/media-source';
import { isoOf, isoOrNull } from '@/shared/data/supabase/time';
import { slugify } from '@/shared/lib/slug';
import type { Localized } from '@/shared/types/localized';

import { adminMembers } from '../domain/admin-directory';
import { type Directory, activeMembers, alumniList, profileResult } from '../domain/directory';
import { NO_CONSENTS, profileFromContext } from '../domain/mine-profile';
import { isReservedUsername } from '../domain/profile-self';
import { canSee } from '../domain/visibility';
import type {
  AuthorFound,
  Badge,
  BoardMandate,
  BoardView,
  CvInfo,
  EventRole,
  MemberConsents,
  Profile,
  ProfileStatus,
  Team,
  TeamRole,
} from '../types';
import type { MembersRepository } from './members.repository';

// ─── What the SQL functions hand over (profile_json, board_view, author_cards, my_profile) ───

type ProfileJson = {
  user_id: string;
  username: string;
  name: string;
  has_photo: boolean;
  photo_bucket: string | null;
  photo_path: string | null;
  photo_public_path: string | null;
  hide_photo: boolean;
  bio: string;
  hide_bio: boolean;
  linkedin_url: string;
  github_url: string;
  visibility: 'public' | 'members_only';
  status: string;
  member_since: string;
  active_to: string | null;
  alumni_now: Localized | null;
  alumni_highlight: Localized | null;
  faculty: string;
  teams: { team_id: string; role: TeamRole }[];
  badges: { badge_id: string; note: string; awarded_at: string }[];
};

type MineJson = {
  profile: ProfileJson;
  consents: { newsletter: boolean; gallery_name: boolean; cv_opt_in: boolean; cv_consent_at: string | null };
  cv: { file_name: string; size: number; uploaded_at: string } | null;
  cv_views: number;
};

type BoardJson = {
  mandates: { id: string; label: string; is_current: boolean }[];
  selected: {
    id: string;
    label: string;
    is_current: boolean;
    seats: {
      seat_id: string;
      board_role_id: string;
      title: string;
      name: string;
      username: string | null;
      photo_bucket: string | null;
      photo_path: string | null;
      photo_public_path: string | null;
    }[];
  } | null;
};

/** Private avatars are delivered by their own route, which asks the database whether this viewer may see the photo (M20g2). */
const AVATAR_ROUTE = '/api/member-photos';

/** Files a member owns live under `<user id>/<file id>.<ext>` in their own bucket folder. */
const AVATARS = 'avatars';
const CVS = 'cvs';
const AVATAR_TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const AVATAR_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

const extensionOf = (mimeType: string) =>
  Object.entries(AVATAR_TYPES).find(([, type]) => type === mimeType)?.[0] ?? 'jpg';

function photoSource(
  client: DbClient,
  row: { photo_bucket: string | null; photo_path: string | null; photo_public_path: string | null },
): string | null {
  if (row.photo_bucket === 'avatars' && row.photo_path) return `${AVATAR_ROUTE}/${row.photo_path}`;
  return mediaSource(client, {
    bucket: row.photo_bucket,
    path: row.photo_path,
    public_path: row.photo_public_path,
  });
}

const toTeam = (row: Tables<'teams'>): Team => ({
  id: row.id,
  slug: row.slug,
  name: row.name as Localized,
  sortOrder: row.sort_order,
});

const toBadge = (row: Tables<'badges'>): Badge => ({
  id: row.id,
  name: row.name as Localized,
  description: (row.description as Localized | null) ?? { mk: '' },
  icon: row.icon,
});

/** A person waiting for the board (or turned down) is not one of the four statuses a profile can have: the app calls it inactive. */
const statusOf = (status: string): ProfileStatus =>
  status === 'active' || status === 'alumni' || status === 'hidden' ? status : 'inactive';

function toProfile(client: DbClient, json: ProfileJson): Profile {
  return {
    userId: json.user_id,
    username: json.username,
    name: json.name,
    photo: json.has_photo ? { src: photoSource(client, json) } : null,
    hidePhoto: json.hide_photo,
    bio: json.bio,
    hideBio: json.hide_bio,
    linkedinUrl: json.linkedin_url,
    githubUrl: json.github_url,
    visibility: json.visibility,
    status: statusOf(json.status),
    memberSince: json.member_since,
    activeTo: json.active_to,
    alumniNow: json.alumni_now,
    alumniHighlight: json.alumni_highlight,
    faculty: json.faculty,
    teams: json.teams.map((entry) => ({ teamId: entry.team_id, role: entry.role })),
    badges: json.badges.map((entry) => ({
      badgeId: entry.badge_id,
      note: entry.note,
      awardedAt: entry.awarded_at,
    })),
    // Derived from applications and event managers (D23); the profile page asks for them when it needs them.
    events: [],
  };
}

const bySortOrder = (a: Team, b: Team) => a.sortOrder - b.sortOrder;
const newestFirst = (a: BoardMandate, b: BoardMandate) =>
  Number(b.isCurrent) - Number(a.isCurrent) || b.startsOn.localeCompare(a.startsOn);
const lower = (text: string) => text.trim().toLowerCase();

/**
 * Members on Supabase. The public reads load what this client may see (`members_directory`, teams, badges: row-level
 * security and the function decide) and run the same pure rules as the mock (`domain/directory.ts`), so the two
 * cannot disagree; callers pick the scope from the audience (visitors: public, members: session), and the audience
 * argument only narrows further. A members-only person a visitor cannot read comes from `profile_restricted`, the board
 * from `board_view`, authors from `author_cards`. Writes go through the staff-only tables and RPCs.
 *
 * Not here yet: the photo and CV files (Storage, M20g2) and deleting an account (the durable flow, M20i).
 */
export function createSupabaseMembersRepository(
  client: DbClient,
  _scope: RepoScope = 'public',
): MembersRepository {
  async function readTeams(): Promise<Team[]> {
    return unwrap(await client.from('teams').select('*').order('sort_order').order('id')).map(toTeam);
  }
  async function readBadges(): Promise<Badge[]> {
    return unwrap(await client.from('badges').select('*').order('created_at').order('id')).map(toBadge);
  }
  async function readProfiles(): Promise<Profile[]> {
    const rows = unwrap(await client.rpc('members_directory')) as unknown as ProfileJson[];
    return rows.map((row) => toProfile(client, row));
  }
  async function directory(): Promise<Directory> {
    const [profiles, teams, badges] = await Promise.all([readProfiles(), readTeams(), readBadges()]);
    return { profiles, teams, badges, mandates: [] };
  }

  async function readMandates(): Promise<BoardMandate[]> {
    const [mandates, seats] = await Promise.all([
      client.from('board_mandates').select('*').order('starts_on', { ascending: false }),
      client.from('board_members').select('*').order('sort_order').order('id'),
    ]);
    const seatRows = unwrap(seats);
    return unwrap(mandates)
      .map((row): BoardMandate => ({
        id: row.id,
        label: row.label,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        isCurrent: row.is_current,
        seats: seatRows
          .filter((seat) => seat.mandate_id === row.id)
          .map((seat) => ({
            id: seat.id,
            boardRoleId: seat.board_role_id,
            title: seat.role_title_snapshot,
            userId: seat.profile_id,
          })),
      }))
      .sort(newestFirst);
  }

  /** A person's own profile and choices; null when there is no profile row (yet). */
  async function readMine(year: number): Promise<MineJson | null> {
    const raw = unwrap(await client.rpc('my_profile', { p_year: year })) as unknown as MineJson | null;
    return raw ?? null;
  }

  async function readConsents(userId: string): Promise<MemberConsents> {
    if (!isUuid(userId)) return { ...NO_CONSENTS };
    const row = unwrapMaybe(
      await client
        .from('member_accounts')
        .select('newsletter_opt_in, gallery_name_opt_in, cv_opt_in, cv_consent_at')
        .eq('profile_id', userId)
        .maybeSingle(),
    );
    return row
      ? {
          newsletter: row.newsletter_opt_in,
          galleryName: row.gallery_name_opt_in,
          cvOptIn: row.cv_opt_in,
          cvConsentAt: isoOrNull(row.cv_consent_at),
        }
      : { ...NO_CONSENTS };
  }

  /** Storage as this person: policies allow their own folder only, so a failure here is a refusal or a bad file. */
  const bucket = (name: string) => client.storage.from(name);

  async function upload(name: string, path: string, bytes: Uint8Array, contentType: string) {
    const { error } = await bucket(name).upload(path, bytes, { contentType, upsert: false });
    if (error)
      throw new DataError(
        /row-level security|unauthorized|forbidden/i.test(error.message) ? 'forbidden' : 'invalid',
        error.message,
      );
  }

  /** Removes a file at once. A failure is not an error: the replaced path is in `storage_cleanup_queue` already. */
  async function removeQuietly(name: string, path: string | null | undefined) {
    if (path)
      await bucket(name)
        .remove([path])
        .catch(() => undefined);
  }

  async function download(name: string, path: string): Promise<Uint8Array | null> {
    const { data, error } = await bucket(name).download(path);
    if (error) {
      if (/not.?found/i.test(error.message)) return null;
      throw new DataError('unknown', error.message);
    }
    return new Uint8Array(await data.arrayBuffer());
  }

  return {
    // ─── Public reads ───
    async listActive(audience, query, currentYear) {
      const hidden = audience === 'visitor' ? Number(unwrap(await client.rpc('members_hidden_count'))) : 0;
      return activeMembers(await directory(), audience, query, currentYear, hidden);
    },

    async listAlumni(audience, query) {
      return alumniList(await directory(), audience, query);
    },

    async getBoard(label) {
      const raw = unwrap(
        await client.rpc('board_view', label ? { p_label: label } : {}),
      ) as unknown as BoardJson;
      const mandates = raw.mandates
        .map((mandate) => ({ id: mandate.id, label: mandate.label, isCurrent: mandate.is_current }))
        .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));
      const selected = raw.selected;
      return {
        mandates,
        selected: selected
          ? {
              id: selected.id,
              label: selected.label,
              isCurrent: selected.is_current,
              seats: selected.seats.map((seat) => {
                const src = photoSource(client, seat);
                return {
                  seatId: seat.seat_id,
                  boardRoleId: seat.board_role_id,
                  title: seat.title,
                  name: seat.name,
                  username: seat.username,
                  photo: src ? { src } : null,
                };
              }),
            }
          : null,
      } satisfies BoardView;
    },

    async getProfile(audience, username, currentYear) {
      const dir = await directory();
      const found = profileResult(dir, audience, username, currentYear);
      if (found?.kind === 'full') {
        // Events on a profile are derived (D23): accepted applications and event manager seats of published events.
        const events = unwrap(await client.rpc('profile_events', { p_profile: found.profile.userId }));
        found.profile.events = events.map((row) => ({
          eventId: row.event_id,
          role: row.event_role as EventRole,
        }));
      }
      if (found || audience === 'member') return found;
      // A members-only person this client cannot read: the page a visitor gets shows the name and teams only.
      const rows = unwrap(await client.rpc('profile_restricted', { p_username: username }));
      const row = rows.find((candidate) => candidate.username === username);
      if (!row) return null;
      const entries = row.teams as unknown as { team_id: string; role: TeamRole }[];
      return {
        kind: 'restricted' as const,
        userId: row.user_id,
        username: row.username,
        name: row.full_name,
        teams: entries
          .flatMap((entry) => dir.teams.filter((team) => team.id === entry.team_id))
          .sort(bySortOrder),
        memberSince: row.member_since ?? '',
      };
    },

    async findAuthors(_audience, userIds) {
      const ids = [...new Set(userIds)].filter(isUuid);
      if (ids.length === 0) return [];
      const rows = unwrap(await client.rpc('author_cards', { p_ids: ids }));
      return rows.map((row): AuthorFound => {
        const page = row.page as AuthorFound['page'];
        const src = photoSource(client, row);
        // What this client may read decides the page (callers pick the scope from the audience).
        const full = page === 'full';
        return {
          userId: row.user_id,
          name: row.full_name,
          username: page === 'none' ? null : row.username,
          page,
          photo: full && src ? { src } : null,
          bio: full ? row.bio : '',
          since: row.since ?? 0,
          teams: row.team_names as unknown as Localized[],
        };
      });
    },

    async listPublicUsernames() {
      return (await readProfiles())
        .filter((profile) => canSee('visitor', profile))
        .map((profile) => profile.username)
        .sort();
    },

    // ─── Admin › Members ───
    async adminList(query) {
      const { profiles, teams } = await directory();
      return { ...adminMembers(profiles, teams, query), teams: [...teams].sort(bySortOrder) };
    },

    async getCatalog() {
      const [teams, badges] = await Promise.all([readTeams(), readBadges()]);
      return { teams, badges };
    },

    async saveProfile(userId, edit, now) {
      if (!isUuid(userId)) return { status: 'not_found' as const };
      const found = unwrap(
        await client.rpc('admin_save_member', {
          p_user: userId,
          p_edit: toJson({
            status: edit.status,
            member_since: edit.memberSince,
            active_to: edit.activeTo,
            alumni_now: edit.alumniNow,
            alumni_highlight: edit.alumniHighlight,
            hide_photo: edit.hidePhoto,
            hide_bio: edit.hideBio,
            // Unknown teams and badges are ignored (a made-up id is not a row).
            teams: edit.teams
              .filter((entry) => isUuid(entry.teamId))
              .map((entry) => ({ team_id: entry.teamId, role: entry.role })),
            badges: edit.badges
              .filter((entry) => isUuid(entry.badgeId))
              .map((entry) => ({ badge_id: entry.badgeId, note: entry.note })),
          }),
          p_now: now.toISOString(),
        }),
      );
      if (!found) return { status: 'not_found' as const };
      const profile = (await readProfiles()).find((candidate) => candidate.userId === userId);
      return profile ? { status: 'saved' as const, profile } : { status: 'not_found' as const };
    },

    // ─── Admin › Teams ───
    async adminTeams() {
      const { profiles, teams } = await directory();
      return [...teams].sort(bySortOrder).map((team) => ({
        ...team,
        members: profiles.filter((profile) => profile.teams.some((entry) => entry.teamId === team.id)).length,
      }));
    },

    async saveTeam(input, id) {
      const teams = await readTeams();
      const wanted = lower(input.name.mk);
      const same = (team: Team) =>
        [team.name.mk, team.name.en].some((name) => name && lower(name) === wanted);
      if (teams.some((team) => team.id !== id && same(team))) return { status: 'duplicate' as const };
      try {
        if (id) {
          if (!isUuid(id) || !teams.some((team) => team.id === id)) return { status: 'not_found' as const };
          const row = unwrap(
            await client
              .from('teams')
              .update({ name: toJson(input.name) })
              .eq('id', id)
              .select('*')
              .single(),
          );
          return { status: 'saved' as const, team: toTeam(row) };
        }
        // The address is made once from the name and kept when the team is renamed.
        const base = slugify(input.name.en?.trim() || input.name.mk) || 'team';
        let slug = base;
        for (let n = 2; teams.some((team) => team.slug === slug); n += 1) slug = `${base}-${n}`;
        const row = unwrap(
          await client
            .from('teams')
            .insert({
              slug,
              name: toJson(input.name),
              sort_order: Math.max(0, ...teams.map((team) => team.sortOrder)) + 1,
            })
            .select('*')
            .single(),
        );
        return { status: 'saved' as const, team: toTeam(row) };
      } catch (error) {
        if (isDataError(error, 'conflict')) return { status: 'duplicate' as const };
        throw error;
      }
    },

    async removeTeam(id) {
      if (!isUuid(id) || !(await readTeams()).some((team) => team.id === id))
        return { status: 'not_found' as const };
      const members = async () => {
        const counted = await client
          .from('member_teams')
          .select('profile_id', { count: 'exact', head: true })
          .eq('team_id', id);
        if (counted.error) throw toDataError(counted.error);
        return counted.count ?? 0;
      };
      const before = await members();
      if (before > 0) return { status: 'in_use' as const, members: before };
      try {
        unwrap(await client.from('teams').delete().eq('id', id).select('id'));
      } catch (error) {
        // Somebody joined the team in the meantime: the foreign key says no.
        if (isDataError(error, 'in_use')) return { status: 'in_use' as const, members: await members() };
        throw error;
      }
      return { status: 'removed' as const };
    },

    async reorderTeams(ids) {
      const teams = await readTeams();
      const listed = ids.flatMap((id) => teams.filter((team) => team.id === id));
      const rest = teams.filter((team) => !ids.includes(team.id));
      unwrap(await client.rpc('reorder_teams', { p_ids: [...listed, ...rest].map((team) => team.id) }));
    },

    // ─── Admin › Badges ───
    async adminBadges() {
      const [badges, awards] = await Promise.all([
        readBadges(),
        client.from('member_badges').select('badge_id'),
      ]);
      const given = unwrap(awards);
      return badges.map((badge) => ({
        ...badge,
        awarded: given.filter((entry) => entry.badge_id === badge.id).length,
      }));
    },

    async saveBadge(input, id) {
      const badges = await readBadges();
      const name = lower(input.name.mk);
      if (badges.some((badge) => badge.id !== id && lower(badge.name.mk) === name))
        return { status: 'duplicate' as const };
      const values = { name: toJson(input.name), description: toJson(input.description), icon: input.icon };
      try {
        if (id) {
          if (!isUuid(id) || !badges.some((badge) => badge.id === id))
            return { status: 'not_found' as const };
          const row = unwrap(await client.from('badges').update(values).eq('id', id).select('*').single());
          return { status: 'saved' as const, badge: toBadge(row) };
        }
        const row = unwrap(await client.from('badges').insert(values).select('*').single());
        return { status: 'saved' as const, badge: toBadge(row) };
      } catch (error) {
        if (isDataError(error, 'conflict')) return { status: 'duplicate' as const };
        throw error;
      }
    },

    async removeBadge(id) {
      if (!isUuid(id) || !(await readBadges()).some((badge) => badge.id === id))
        return { status: 'not_found' as const };
      const counted = await client
        .from('member_badges')
        .select('profile_id', { count: 'exact', head: true })
        .eq('badge_id', id);
      if (counted.error) throw toDataError(counted.error);
      // The awards go with the badge (cascade).
      unwrap(await client.from('badges').delete().eq('id', id).select('id'));
      return { status: 'removed' as const, affected: counted.count ?? 0 };
    },

    // ─── Admin › Board ───
    async adminBoards() {
      const [mandates, profiles] = await Promise.all([readMandates(), readProfiles()]);
      const people = profiles
        .filter((profile) => profile.status === 'active' || profile.status === 'alumni')
        .map((profile) => ({ userId: profile.userId, name: profile.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'en'));
      return { mandates, people };
    },

    async saveMandate(input, id) {
      const mandates = await readMandates();
      if (mandates.some((mandate) => mandate.id !== id && mandate.label === input.label))
        return { status: 'duplicate' as const };
      if (id && (!isUuid(id) || !mandates.some((mandate) => mandate.id === id)))
        return { status: 'not_found' as const };
      const values = { label: input.label, starts_on: input.startsOn, ends_on: input.endsOn };
      let savedId: string;
      try {
        savedId = id
          ? unwrap(await client.from('board_mandates').update(values).eq('id', id).select('id').single()).id
          : unwrap(
              await client
                .from('board_mandates')
                .insert({ ...values, is_current: false })
                .select('id')
                .single(),
            ).id;
      } catch (error) {
        if (isDataError(error, 'conflict')) return { status: 'duplicate' as const };
        throw error;
      }
      // Exactly one board is current: marking one moves it, the first board is current, the current one stays current.
      if (input.isCurrent || !mandates.some((mandate) => mandate.id !== savedId && mandate.isCurrent))
        unwrap(await client.rpc('set_current_mandate', { p_id: savedId }));
      const mandate = (await readMandates()).find((item) => item.id === savedId);
      return mandate ? { status: 'saved' as const, mandate } : { status: 'not_found' as const };
    },

    async removeMandate(id) {
      const mandate = isUuid(id) ? (await readMandates()).find((item) => item.id === id) : undefined;
      if (!mandate) return { status: 'not_found' as const };
      if (mandate.isCurrent) return { status: 'current' as const };
      unwrap(await client.from('board_mandates').delete().eq('id', id).select('id'));
      return { status: 'removed' as const };
    },

    async saveSeat(mandateId, input, seatId) {
      const mandate = isUuid(mandateId)
        ? (await readMandates()).find((item) => item.id === mandateId)
        : undefined;
      if (!mandate) return { status: 'not_found' as const };
      const person = (await readProfiles()).find((profile) => profile.userId === input.userId);
      if (!person || (person.status !== 'active' && person.status !== 'alumni'))
        return { status: 'person_not_found' as const };
      if (seatId && (!isUuid(seatId) || !mandate.seats.some((seat) => seat.id === seatId)))
        return { status: 'not_found' as const };
      if (!isUuid(input.boardRoleId)) return { status: 'not_found' as const };
      try {
        const values = {
          board_role_id: input.boardRoleId,
          role_title_snapshot: input.title,
          profile_id: input.userId,
        };
        if (seatId) unwrap(await client.from('board_members').update(values).eq('id', seatId).select('id'));
        else
          unwrap(
            await client
              .from('board_members')
              .insert({
                ...values,
                mandate_id: mandateId,
                sort_order: Math.max(-1, ...mandate.seats.map((_, index) => index)) + 1,
              })
              .select('id'),
          );
      } catch (error) {
        // A position that does not exist.
        if (isDataError(error, 'in_use')) return { status: 'not_found' as const };
        throw error;
      }
      const saved = (await readMandates()).find((item) => item.id === mandateId);
      return saved ? { status: 'saved' as const, mandate: saved } : { status: 'not_found' as const };
    },

    async removeSeat(mandateId, seatId) {
      if (!isUuid(mandateId) || !isUuid(seatId)) return false;
      const removed = unwrap(
        await client.from('board_members').delete().eq('id', seatId).eq('mandate_id', mandateId).select('id'),
      );
      return removed.length > 0;
    },

    async reorderSeats(mandateId, seatIds) {
      const mandate = isUuid(mandateId)
        ? (await readMandates()).find((item) => item.id === mandateId)
        : undefined;
      if (!mandate) return;
      const listed = seatIds.flatMap((id) => mandate.seats.filter((seat) => seat.id === id));
      const rest = mandate.seats.filter((seat) => !seatIds.includes(seat.id));
      unwrap(
        await client.rpc('reorder_seats', {
          p_mandate: mandateId,
          p_ids: [...listed, ...rest].map((seat) => seat.id),
        }),
      );
    },

    // ─── My profile ───
    async getMine(who, year) {
      const mine = await readMine(year);
      if (!mine)
        return {
          profile: profileFromContext(who),
          pending: who.pending,
          consents: { ...NO_CONSENTS },
          cv: null,
          cvViewsThisYear: 0,
        };
      const cv: CvInfo | null = mine.cv
        ? { fileName: mine.cv.file_name, size: mine.cv.size, uploadedAt: isoOf(mine.cv.uploaded_at) }
        : null;
      return {
        profile: toProfile(client, mine.profile),
        pending: mine.profile.status === 'pending',
        consents: {
          newsletter: mine.consents.newsletter,
          galleryName: mine.consents.gallery_name,
          cvOptIn: mine.consents.cv_opt_in,
          cvConsentAt: isoOrNull(mine.consents.cv_consent_at),
        },
        cv,
        cvViewsThisYear: Number(mine.cv_views),
      };
    },

    async usernameAvailable(userId, username) {
      const taken = unwrap(
        await client.rpc('username_taken', {
          p_username: username,
          ...(isUuid(userId) ? { p_except: userId } : {}),
        }),
      );
      return !taken;
    },

    async updateMine(_who, edit) {
      if (isReservedUsername(edit.username)) return { status: 'username_reserved' as const };
      const result = unwrap(
        await client.rpc('update_my_profile', {
          p_edit: toJson({
            name: edit.name,
            username: edit.username,
            bio: edit.bio,
            linkedin_url: edit.linkedinUrl,
            github_url: edit.githubUrl,
            faculty: edit.faculty,
          }),
        }),
      ) as unknown as { status: 'saved' | 'username_taken' | 'not_found' };
      if (result.status === 'username_taken') return { status: 'username_taken' as const };
      if (result.status === 'not_found') throw new DataError('not_found', 'There is no profile to edit');
      const mine = await readMine(new Date().getUTCFullYear());
      if (!mine) throw new DataError('not_found', 'There is no profile to edit');
      return { status: 'saved' as const, profile: toProfile(client, mine.profile) };
    },

    async setVisibility(who, visibility) {
      const rows = unwrap(
        await client.from('profiles').update({ visibility }).eq('id', who.userId).select('id'),
      );
      if (rows.length === 0) throw new DataError('not_found', 'There is no profile to edit');
    },

    /** Uploads into the person's own folder, then the database makes it the photo and names the file it replaces. */
    async savePhoto(who, photo) {
      if (!isUuid(who.userId)) throw new DataError('not_found', 'There is no profile to edit');
      if (!photo) {
        const previous = unwrap(await client.rpc('remove_my_photo')) as string | null;
        await removeQuietly(AVATARS, previous);
        return { src: null };
      }
      const path = `${who.userId}/${crypto.randomUUID()}.${extensionOf(photo.mimeType)}`;
      await upload(AVATARS, path, photo.bytes, photo.mimeType);
      const { data, error } = await client.rpc('set_my_photo', {
        p_path: path,
        p_mime: photo.mimeType,
        p_size: photo.bytes.byteLength,
        p_file_name: `photo.${extensionOf(photo.mimeType)}`,
      });
      const result = error ? null : (data as { status: 'saved' | 'not_found'; previous?: string | null });
      if (error || result?.status !== 'saved') {
        await removeQuietly(AVATARS, path);
        if (error) throw toDataError(error);
        throw new DataError('not_found', 'There is no profile to edit');
      }
      await removeQuietly(AVATARS, result.previous);
      return { src: `${AVATAR_ROUTE}/${path}` };
    },

    async getPhotoFile(who) {
      if (!isUuid(who.userId)) return null;
      const profile = unwrapMaybe(
        await client.from('profiles').select('photo_media_id').eq('id', who.userId).maybeSingle(),
      );
      if (!profile?.photo_media_id) return null;
      const media = unwrapMaybe(
        await client
          .from('media')
          .select('bucket, path, mime_type')
          .eq('id', profile.photo_media_id)
          .maybeSingle(),
      );
      if (media?.bucket !== AVATARS || !media.path) return null;
      const bytes = await download(AVATARS, media.path);
      return bytes ? { mimeType: media.mime_type ?? 'image/jpeg', bytes } : null;
    },

    /** Read as the viewer: Storage lets an avatar through only where `can_read_avatar` says so, and a refusal looks like a missing file. */
    async avatarFile(path) {
      const type = AVATAR_PATH.test(path) ? AVATAR_TYPES[path.slice(path.lastIndexOf('.') + 1)] : undefined;
      if (!type) return null;
      const bytes = await download(AVATARS, path).catch(() => null);
      return bytes ? { mimeType: type, bytes } : null;
    },

    /** Turning CV sharing on stamps the moment (database clock); off forgets the file at once (trigger). Messages and gallery names are plain choices. */
    async setConsents(userId, patch) {
      const update: Partial<Tables<'member_accounts'>> = {};
      if (patch.newsletter !== undefined) update.newsletter_opt_in = patch.newsletter;
      if (patch.galleryName !== undefined) update.gallery_name_opt_in = patch.galleryName;
      if (patch.cvOptIn !== undefined) update.cv_opt_in = patch.cvOptIn;
      // Off deletes the CV now: the trigger clears the row and queues the file, which is removed here without waiting.
      const forgotten =
        patch.cvOptIn === false && isUuid(userId)
          ? unwrapMaybe(
              await client.from('member_accounts').select('cv_path').eq('profile_id', userId).maybeSingle(),
            )?.cv_path
          : null;
      if (isUuid(userId) && Object.keys(update).length > 0)
        unwrap(
          await client.from('member_accounts').update(update).eq('profile_id', userId).select('profile_id'),
        );
      await removeQuietly(CVS, forgotten);
      return readConsents(userId);
    },

    /** The CV goes into the person's folder, then the database registers it, but only while CV sharing is on. */
    async storeCv(userId, file, now) {
      if (!isUuid(userId)) throw new DataError('not_found', 'There is no account to store a CV for');
      if (!(await readConsents(userId)).cvOptIn) return { status: 'not_opted_in' };
      const path = `${userId}/${crypto.randomUUID()}.pdf`;
      await upload(CVS, path, file.bytes, 'application/pdf');
      const { data, error } = await client.rpc('set_my_cv', {
        p_path: path,
        p_file_name: file.fileName,
        p_size: file.bytes.byteLength,
        p_now: now.toISOString(),
      });
      const result = error
        ? null
        : (data as {
            status: 'stored' | 'not_opted_in' | 'not_found';
            previous?: string | null;
            cv?: { file_name: string; size: number; uploaded_at: string };
          });
      if (error || result?.status !== 'stored' || !result.cv) {
        await removeQuietly(CVS, path);
        if (error) throw toDataError(error);
        if (result?.status === 'not_opted_in') return { status: 'not_opted_in' };
        throw new DataError('not_found', 'There is no account to store a CV for');
      }
      await removeQuietly(CVS, result.previous);
      return {
        status: 'stored',
        cv: {
          fileName: result.cv.file_name,
          size: result.cv.size,
          uploadedAt: isoOf(result.cv.uploaded_at),
        },
      };
    },

    async removeCv() {
      const previous = unwrap(await client.rpc('remove_my_cv')) as string | null;
      await removeQuietly(CVS, previous);
      return previous !== null;
    },

    async getCvFile(userId) {
      if (!isUuid(userId)) return null;
      const row = unwrapMaybe(
        await client
          .from('member_accounts')
          .select('cv_path, cv_file_name, cv_size')
          .eq('profile_id', userId)
          .maybeSingle(),
      );
      if (!row?.cv_path) return null;
      return {
        fileName: row.cv_file_name ?? 'cv.pdf',
        size: row.cv_size ?? 0,
        bytes: await download(CVS, row.cv_path),
      };
    },
    deleteMine() {
      return Promise.reject(
        new NotImplementedError('members.deleteMine is the account-deletion port, which M20i brings'),
      );
    },
  };
}
