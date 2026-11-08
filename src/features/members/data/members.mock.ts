import 'server-only';

import type { ApprovedMemberIdentity } from '@/features/auth';
import { mockTable } from '@/shared/data/mock/store';
import { slugify } from '@/shared/lib/slug';

import { adminMembers } from '../domain/admin-directory';
import { type Directory, activeMembers, alumniList, boardView, profileResult } from '../domain/directory';
import { canSee, isRestrictedFor } from '../domain/visibility';
import { isReservedUsername } from '../domain/profile-self';
import type {
  Badge,
  BoardMandate,
  CvInfo,
  MemberConsents,
  MineContext,
  Profile,
  SelfEdit,
  Team,
} from '../types';
import { mandatesFixture } from './fixtures/board';
import { consentsFixture, cvsFixture } from './fixtures/me';
import { profilesFixture } from './fixtures/profiles';
import { badgesFixture, teamsFixture } from './fixtures/teams';
import type { MembersRepository } from './members.repository';

/** What a person waiting for the board has written so far (merged into the profile at approval). */
type Draft = Partial<
  Pick<Profile, 'name' | 'username' | 'bio' | 'linkedinUrl' | 'githubUrl' | 'faculty' | 'visibility'>
> & { photo?: Profile['photo'] };

type Tables = {
  profiles: Profile[];
  teams: Team[];
  badges: Badge[];
  mandates: BoardMandate[];
  drafts: Record<string, Draft>;
  consents: Record<string, MemberConsents>;
  cvs: Record<string, { info: CvInfo; bytes: Uint8Array | null }>;
  /** Partners' CV exports (the admin export that writes here comes later): [{ userId, at }]. */
  cvExports: { userId: string; at: string }[];
};

const NO_CONSENTS: MemberConsents = {
  newsletter: false,
  galleryName: false,
  cvOptIn: false,
  cvConsentAt: null,
};

const tables = () =>
  mockTable<Tables>('members', () => ({
    profiles: profilesFixture,
    teams: teamsFixture,
    badges: badgesFixture,
    mandates: mandatesFixture,
    drafts: {},
    consents: consentsFixture,
    cvs: cvsFixture,
    cvExports: [],
  }));

/**
 * A person the board approved in Approvals has a profile from that moment: public facts from the
 * sign-up, no team, member since the approval. In Supabase this is the same `profiles` row; here the
 * stored profile (once the board edits it) wins over this default.
 */
export function profileFromIdentity(identity: ApprovedMemberIdentity): Profile {
  return {
    userId: identity.userId,
    username: identity.username,
    name: identity.name,
    photo: identity.photoUrl ? { src: identity.photoUrl } : null,
    hidePhoto: false,
    bio: '',
    hideBio: false,
    linkedinUrl: '',
    githubUrl: '',
    visibility: identity.visibility === 'public' ? 'public' : 'members_only',
    status: 'active',
    memberSince: identity.approvedAt.slice(0, 10),
    activeTo: null,
    alumniNow: null,
    alumniHighlight: null,
    faculty: identity.faculty,
    teams: [],
    badges: [],
    events: [],
  };
}

/** The profile a person has before anything is stored: what they gave at sign-up, no team, member since then. */
function profileFromContext(who: MineContext): Profile {
  return {
    userId: who.userId,
    username: who.username,
    name: who.name,
    photo: who.photoUrl ? { src: who.photoUrl } : null,
    hidePhoto: false,
    bio: '',
    hideBio: false,
    linkedinUrl: '',
    githubUrl: '',
    visibility: who.visibility,
    // Waiting for the board: nobody sees it.
    status: who.pending ? 'inactive' : 'active',
    memberSince: who.since.slice(0, 10),
    activeTo: null,
    alumniNow: null,
    alumniHighlight: null,
    faculty: who.faculty,
    teams: [],
    badges: [],
    events: [],
  };
}

function withDraft(profile: Profile, draft: Draft | undefined): Profile {
  if (!draft) return profile;
  const { photo, ...text } = draft;
  return { ...profile, ...text, ...(photo !== undefined ? { photo } : {}) };
}

export function createMockMembersRepository(
  approvedIdentities: () => Promise<ApprovedMemberIdentity[]> = () => Promise.resolve([]),
): MembersRepository {
  const db = tables();

  const usernameAvailable = async (userId: string, username: string) =>
    !(await directory()).profiles.some(
      (profile) => profile.userId !== userId && profile.username === username,
    );

  /** The person's stored profile; the first time, it is made from what they gave at sign-up plus their draft. */
  const storedProfile = (who: MineContext): Profile => {
    let profile = db.profiles.find((item) => item.userId === who.userId);
    if (!profile) {
      profile = withDraft(profileFromContext(who), db.drafts[who.userId]);
      db.profiles.push(profile);
      delete db.drafts[who.userId];
    }
    return profile;
  };

  const directory = async (): Promise<Directory> => {
    const stored = new Set(db.profiles.map((profile) => profile.userId));
    const adopted = (await approvedIdentities())
      .filter((identity) => !stored.has(identity.userId))
      .map((identity) => withDraft(profileFromIdentity(identity), db.drafts[identity.userId]));
    return {
      profiles: [...db.profiles, ...adopted],
      teams: db.teams,
      badges: db.badges,
      mandates: db.mandates,
    };
  };

  return {
    async listActive(audience, query, currentYear) {
      return structuredClone(activeMembers(await directory(), audience, query, currentYear));
    },
    async listAlumni(audience, query) {
      return structuredClone(alumniList(await directory(), audience, query));
    },
    async getBoard(label) {
      return structuredClone(boardView(await directory(), label));
    },
    async findAuthors(audience, userIds) {
      const { profiles, teams } = await directory();
      const wanted = new Set(userIds);
      return structuredClone(
        profiles
          .filter((profile) => wanted.has(profile.userId))
          .map((profile) => ({
            profile,
            page: canSee(audience, profile)
              ? ('full' as const)
              : isRestrictedFor(audience, profile)
                ? ('restricted' as const)
                : ('none' as const),
            teams: profile.teams.flatMap((entry) => teams.filter((team) => team.id === entry.teamId)),
          })),
      );
    },
    async getProfile(audience, username, currentYear) {
      return structuredClone(profileResult(await directory(), audience, username, currentYear));
    },
    async adminList(query) {
      const { profiles, teams } = await directory();
      return structuredClone({
        ...adminMembers(profiles, teams, query),
        teams: [...teams].sort((a, b) => a.sortOrder - b.sortOrder),
      });
    },
    getCatalog() {
      return Promise.resolve(
        structuredClone({
          teams: [...db.teams].sort((a, b) => a.sortOrder - b.sortOrder),
          badges: db.badges,
        }),
      );
    },
    async saveProfile(userId, edit, now) {
      const known = (await directory()).profiles.find((profile) => profile.userId === userId);
      if (!known) return { status: 'not_found' as const };
      // The first save of a person the board approved (not stored yet) keeps what they gave at sign-up.
      let profile = db.profiles.find((item) => item.userId === userId);
      if (!profile) {
        profile = structuredClone(known);
        db.profiles.push(profile);
      }
      const awarded = new Map(profile.badges.map((badge) => [badge.badgeId, badge.awardedAt]));
      profile.status = edit.status;
      profile.memberSince = edit.memberSince;
      profile.activeTo = edit.status === 'alumni' ? edit.activeTo : null;
      profile.teams = edit.teams.filter((entry) => db.teams.some((team) => team.id === entry.teamId));
      profile.badges = edit.badges
        .filter((entry) => db.badges.some((badge) => badge.id === entry.badgeId))
        .map((entry) => ({
          badgeId: entry.badgeId,
          note: entry.note,
          awardedAt: awarded.get(entry.badgeId) ?? now.toISOString().slice(0, 10),
        }));
      profile.events = edit.events;
      profile.alumniNow = edit.status === 'alumni' ? edit.alumniNow : null;
      profile.alumniHighlight = edit.status === 'alumni' ? edit.alumniHighlight : null;
      profile.hidePhoto = edit.hidePhoto;
      profile.hideBio = edit.hideBio;
      return { status: 'saved' as const, profile: structuredClone(profile) };
    },

    // ─── Teams ───
    async adminTeams() {
      const teams = [...db.teams].sort((a, b) => a.sortOrder - b.sortOrder);
      const members = (await directory()).profiles;
      return structuredClone(
        teams.map((team) => ({
          ...team,
          members: members.filter((profile) => profile.teams.some((entry) => entry.teamId === team.id))
            .length,
        })),
      );
    },
    saveTeam(input, id) {
      const same = (team: Team) =>
        [team.name.mk, team.name.en].some(
          (name) => name?.trim().toLowerCase() === input.name.mk.trim().toLowerCase(),
        );
      if (db.teams.some((team) => team.id !== id && same(team)))
        return Promise.resolve({ status: 'duplicate' as const });
      if (id) {
        const team = db.teams.find((item) => item.id === id);
        if (!team) return Promise.resolve({ status: 'not_found' as const });
        team.name = structuredClone(input.name);
        return Promise.resolve({ status: 'saved' as const, team: structuredClone(team) });
      }
      const base = slugify(input.name.en?.trim() || input.name.mk) || 'team';
      let slug = base;
      for (let n = 2; db.teams.some((team) => team.slug === slug); n += 1) slug = `${base}-${n}`;
      const team: Team = {
        id: `t-${crypto.randomUUID().slice(0, 8)}`,
        slug,
        name: structuredClone(input.name),
        sortOrder: Math.max(0, ...db.teams.map((item) => item.sortOrder)) + 1,
      };
      db.teams.push(team);
      return Promise.resolve({ status: 'saved' as const, team: structuredClone(team) });
    },
    async removeTeam(id) {
      const team = db.teams.find((item) => item.id === id);
      if (!team) return { status: 'not_found' as const };
      const members = (await directory()).profiles.filter((profile) =>
        profile.teams.some((entry) => entry.teamId === id),
      ).length;
      if (members > 0) return { status: 'in_use' as const, members };
      db.teams.splice(db.teams.indexOf(team), 1);
      return { status: 'removed' as const };
    },
    reorderTeams(ids) {
      const listed = ids.flatMap((id) => db.teams.filter((team) => team.id === id));
      const rest = db.teams
        .filter((team) => !ids.includes(team.id))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      [...listed, ...rest].forEach((team, index) => {
        team.sortOrder = index + 1;
      });
      return Promise.resolve();
    },

    // ─── Badges ───
    async adminBadges() {
      const profiles = (await directory()).profiles;
      return structuredClone(
        db.badges.map((badge) => ({
          ...badge,
          awarded: profiles.filter((profile) => profile.badges.some((entry) => entry.badgeId === badge.id))
            .length,
        })),
      );
    },
    saveBadge(input, id) {
      const name = input.name.mk.trim().toLowerCase();
      if (db.badges.some((badge) => badge.id !== id && badge.name.mk.trim().toLowerCase() === name))
        return Promise.resolve({ status: 'duplicate' as const });
      if (id) {
        const badge = db.badges.find((item) => item.id === id);
        if (!badge) return Promise.resolve({ status: 'not_found' as const });
        Object.assign(badge, structuredClone(input));
        return Promise.resolve({ status: 'saved' as const, badge: structuredClone(badge) });
      }
      const badge: Badge = { id: `b-${crypto.randomUUID().slice(0, 8)}`, ...structuredClone(input) };
      db.badges.push(badge);
      return Promise.resolve({ status: 'saved' as const, badge: structuredClone(badge) });
    },
    async removeBadge(id) {
      const badge = db.badges.find((item) => item.id === id);
      if (!badge) return { status: 'not_found' as const };
      // Stored profiles lose the award; people the board never edited have none to lose.
      let affected = 0;
      for (const profile of (await directory()).profiles) {
        if (profile.badges.some((entry) => entry.badgeId === id)) affected += 1;
      }
      for (const profile of db.profiles)
        profile.badges = profile.badges.filter((entry) => entry.badgeId !== id);
      db.badges.splice(db.badges.indexOf(badge), 1);
      return { status: 'removed' as const, affected };
    },

    // ─── Board ───
    async adminBoards() {
      const people = (await directory()).profiles
        .filter((profile) => profile.status === 'active' || profile.status === 'alumni')
        .map((profile) => ({ userId: profile.userId, name: profile.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'en'));
      const mandates = [...db.mandates].sort(
        (a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.startsOn.localeCompare(a.startsOn),
      );
      return structuredClone({ mandates, people });
    },
    saveMandate(input, id) {
      if (db.mandates.some((mandate) => mandate.id !== id && mandate.label === input.label))
        return Promise.resolve({ status: 'duplicate' as const });
      let mandate = id ? db.mandates.find((item) => item.id === id) : undefined;
      if (id && !mandate) return Promise.resolve({ status: 'not_found' as const });
      if (!mandate) {
        mandate = {
          id: `m-${crypto.randomUUID().slice(0, 8)}`,
          label: input.label,
          startsOn: input.startsOn,
          endsOn: input.endsOn,
          isCurrent: false,
          seats: [],
        };
        db.mandates.push(mandate);
      }
      mandate.label = input.label;
      mandate.startsOn = input.startsOn;
      mandate.endsOn = input.endsOn;
      // Exactly one board is current: marking one moves it, and the first board is current.
      if (input.isCurrent || !db.mandates.some((item) => item !== mandate && item.isCurrent)) {
        for (const item of db.mandates) item.isCurrent = item === mandate;
      }
      return Promise.resolve({ status: 'saved' as const, mandate: structuredClone(mandate) });
    },
    removeMandate(id) {
      const mandate = db.mandates.find((item) => item.id === id);
      if (!mandate) return Promise.resolve({ status: 'not_found' as const });
      if (mandate.isCurrent) return Promise.resolve({ status: 'current' as const });
      db.mandates.splice(db.mandates.indexOf(mandate), 1);
      return Promise.resolve({ status: 'removed' as const });
    },
    async saveSeat(mandateId, input, seatId) {
      const mandate = db.mandates.find((item) => item.id === mandateId);
      if (!mandate) return { status: 'not_found' as const };
      const person = (await directory()).profiles.find((profile) => profile.userId === input.userId);
      if (!person || (person.status !== 'active' && person.status !== 'alumni'))
        return { status: 'person_not_found' as const };
      // A person on the board must have a stored profile to be kept even if sign-up data changes.
      if (!db.profiles.some((profile) => profile.userId === person.userId))
        db.profiles.push(structuredClone(person));
      if (seatId) {
        const seat = mandate.seats.find((item) => item.id === seatId);
        if (!seat) return { status: 'not_found' as const };
        Object.assign(seat, input);
      } else {
        mandate.seats.push({ id: `bs-${crypto.randomUUID().slice(0, 8)}`, ...input });
      }
      return { status: 'saved' as const, mandate: structuredClone(mandate) };
    },
    removeSeat(mandateId, seatId) {
      const mandate = db.mandates.find((item) => item.id === mandateId);
      const seat = mandate?.seats.find((item) => item.id === seatId);
      if (!mandate || !seat) return Promise.resolve(false);
      mandate.seats.splice(mandate.seats.indexOf(seat), 1);
      return Promise.resolve(true);
    },
    reorderSeats(mandateId, seatIds) {
      const mandate = db.mandates.find((item) => item.id === mandateId);
      if (mandate) {
        const listed = seatIds.flatMap((id) => mandate.seats.filter((seat) => seat.id === id));
        mandate.seats = [...listed, ...mandate.seats.filter((seat) => !seatIds.includes(seat.id))];
      }
      return Promise.resolve();
    },

    // ─── My profile ───
    getMine(who, year) {
      const stored = db.profiles.find((item) => item.userId === who.userId);
      const profile = stored ?? withDraft(profileFromContext(who), db.drafts[who.userId]);
      return Promise.resolve(
        structuredClone({
          profile,
          pending: who.pending,
          consents: db.consents[who.userId] ?? NO_CONSENTS,
          cv: db.cvs[who.userId]?.info ?? null,
          cvViewsThisYear: db.cvExports.filter(
            (entry) => entry.userId === who.userId && new Date(entry.at).getFullYear() === year,
          ).length,
        }),
      );
    },

    usernameAvailable,

    async updateMine(who, edit: SelfEdit) {
      if (isReservedUsername(edit.username)) return { status: 'username_reserved' as const };
      if (!(await usernameAvailable(who.userId, edit.username))) return { status: 'username_taken' as const };
      const fields = {
        name: edit.name,
        username: edit.username,
        bio: edit.bio,
        linkedinUrl: edit.linkedinUrl,
        githubUrl: edit.githubUrl,
        faculty: edit.faculty,
      };
      if (who.pending) {
        const draft = (db.drafts[who.userId] ??= {});
        Object.assign(draft, fields);
        return {
          status: 'saved' as const,
          profile: structuredClone(withDraft(profileFromContext(who), draft)),
        };
      }
      const profile = storedProfile(who);
      Object.assign(profile, fields);
      return { status: 'saved' as const, profile: structuredClone(profile) };
    },

    setVisibility(who, visibility) {
      if (who.pending) (db.drafts[who.userId] ??= {}).visibility = visibility;
      else storedProfile(who).visibility = visibility;
      return Promise.resolve();
    },

    setPhoto(who, photoUrl) {
      const next = photoUrl ? { src: photoUrl } : null;
      if (who.pending) {
        const draft = (db.drafts[who.userId] ??= {});
        const before = draft.photo !== undefined ? draft.photo : who.photoUrl ? { src: who.photoUrl } : null;
        draft.photo = next;
        return Promise.resolve(before?.src ?? null);
      }
      const profile = storedProfile(who);
      const before = profile.photo?.src ?? null;
      profile.photo = next;
      return Promise.resolve(before);
    },

    setConsents(userId, patch, now) {
      const consents = (db.consents[userId] ??= { ...NO_CONSENTS });
      if (patch.newsletter !== undefined) consents.newsletter = patch.newsletter;
      if (patch.galleryName !== undefined) consents.galleryName = patch.galleryName;
      if (patch.cvOptIn !== undefined && patch.cvOptIn !== consents.cvOptIn) {
        consents.cvOptIn = patch.cvOptIn;
        consents.cvConsentAt = patch.cvOptIn ? now.toISOString() : null;
        // Off means the file goes now, not at the next clean-up.
        if (!patch.cvOptIn) delete db.cvs[userId];
      }
      return Promise.resolve({ ...consents });
    },

    storeCv(userId, file, now) {
      if (!db.consents[userId]?.cvOptIn) return Promise.resolve({ status: 'not_opted_in' as const });
      const info: CvInfo = {
        fileName: file.fileName,
        size: file.bytes.byteLength,
        uploadedAt: now.toISOString(),
      };
      db.cvs[userId] = { info, bytes: file.bytes };
      return Promise.resolve({ status: 'stored' as const, cv: { ...info } });
    },

    removeCv(userId) {
      const had = userId in db.cvs;
      delete db.cvs[userId];
      return Promise.resolve(had);
    },

    getCvFile(userId) {
      const entry = db.cvs[userId];
      return Promise.resolve(
        entry ? { fileName: entry.info.fileName, size: entry.info.size, bytes: entry.bytes } : null,
      );
    },

    deleteMine(userId) {
      const stored = db.profiles.find((item) => item.userId === userId);
      const draftPhoto = db.drafts[userId]?.photo;
      const photoUrl = stored ? (stored.photo?.src ?? null) : (draftPhoto?.src ?? null);
      if (stored) db.profiles.splice(db.profiles.indexOf(stored), 1);
      delete db.drafts[userId];
      delete db.consents[userId];
      delete db.cvs[userId];
      db.cvExports = db.cvExports.filter((entry) => entry.userId !== userId);
      for (const mandate of db.mandates)
        mandate.seats = mandate.seats.filter((seat) => seat.userId !== userId);
      return Promise.resolve({ photoUrl });
    },

    async listPublicUsernames() {
      return (await directory()).profiles
        .filter((profile) => canSee('visitor', profile))
        .map((profile) => profile.username)
        .sort();
    },
  };
}
