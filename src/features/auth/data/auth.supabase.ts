import 'server-only';

import { NotImplementedError, type RepoScope } from '@/shared/data/select-implementation';
import type { DbClient } from '@/shared/data/supabase/clients';
import { DataError, isDataError, unwrap } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { isoOrNull } from '@/shared/data/supabase/time';
import { initials } from '@/shared/lib/initials';
import type { Localized } from '@/shared/types/localized';

import type {
  AccountDetails,
  AccountExport,
  AdminAccount,
  AdminRole,
  MemberRegistration,
  MemberYear,
  Session,
  TwoFactorStatus,
} from '../types';
import { MEMBER_YEARS } from '../types';
import type { AuthRepository } from './auth.repository';
import { createSignInMethods, type SignInDeps } from './auth.supabase-sign-in';

// ─── What the SQL functions hand over (0025) ───

type SessionJson = {
  user_id: string;
  email: string;
  name: string;
  username: string;
  member_status: string | null;
  member_since: string | null;
  admin_role: AdminRole | null;
  managed_event_ids: string[];
  teams: Localized[];
};

type RegistrationJson = {
  user_id: string;
  name: string;
  email: string;
  faculty: string;
  year: string;
  phone: string;
  visibility: 'public' | 'members';
  photo_path: string | null;
  status: MemberRegistration['status'];
  locale: 'mk' | 'en';
  submitted_at: string;
  confirmed_at: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
};

type AdminJson = {
  user_id: string;
  name: string;
  email: string;
  role: AdminRole;
  managed_event_ids: string[];
  two_factor: TwoFactorStatus;
  status: AdminAccount['status'];
  last_active_at: string | null;
  invited_at: string | null;
};

type DetailsJson = {
  email: string;
  phone: string;
  year: string | null;
  data_consent_at: string | null;
  password_changed_at: string | null;
};

const yearOf = (value: string | null): MemberYear | null =>
  (MEMBER_YEARS as readonly string[]).includes(value ?? '') ? (value as MemberYear) : null;

/** The text of a localized name for a line under a person's name (English where there is one). */
const plain = (name: Localized) => name.en || name.mk;

function toSession(row: SessionJson): Session {
  const memberStatus =
    row.member_status === 'pending' || row.member_status === 'active' || row.member_status === 'alumni'
      ? row.member_status
      : null;
  const since = row.member_since ? `member since ${row.member_since.slice(0, 4)}` : '';
  const teams = row.teams.map(plain).join(', ');
  return {
    userId: row.user_id,
    name: row.name,
    initials: initials(row.name),
    username: row.username,
    email: row.email,
    headline: memberStatus ? [teams, since].filter(Boolean).join(' · ') : '',
    memberStatus,
    adminRole: row.admin_role,
    managedEventIds: row.managed_event_ids,
  };
}

function toRegistration(row: RegistrationJson): MemberRegistration {
  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    faculty: row.faculty,
    year: yearOf(row.year) ?? '1',
    phone: row.phone,
    visibility: row.visibility,
    photoId: null,
    photoSrc: row.photo_path ? `/api/member-photos/${row.photo_path}` : null,
    status: row.status,
    locale: row.locale,
    submittedAt: new Date(row.submitted_at).toISOString(),
    confirmedAt: isoOrNull(row.confirmed_at),
    decidedAt: isoOrNull(row.decided_at),
    rejectionReason: row.rejection_reason,
  };
}

const toAdmin = (row: AdminJson): AdminAccount => ({
  userId: row.user_id,
  name: row.name,
  email: row.email,
  initials: initials(row.name),
  role: row.role,
  managedEventIds: row.managed_event_ids,
  twoFactor: row.two_factor,
  status: row.status,
  lastActiveAt: isoOrNull(row.last_active_at),
  invitedAt: isoOrNull(row.invited_at),
});

const toDetails = (userId: string, row: DetailsJson): AccountDetails => ({
  userId,
  email: row.email,
  phone: row.phone,
  year: yearOf(row.year),
  dataConsentAt: isoOrNull(row.data_consent_at),
  passwordChangedAt: isoOrNull(row.password_changed_at),
});

/** The flows that need Auth itself (sign-in, links, passwords, invites) are M21: they say so instead of guessing. */
const notYet = (what: string) => () =>
  Promise.reject(new NotImplementedError(`auth.${what} comes with the sign-in flows (M21)`));

/**
 * Auth on a database, the part that only reads or changes what exists: who is signed in, the registrations the board
 * decides, a member's account details and the board's accounts and roles. Signing in and out, links, passwords, 2-step
 * and invites are M21; deleting an account is the account-deletion port (`members/data/account-deletion.ts`).
 */
export function createSupabaseAuthRepository(
  client: DbClient,
  _scope: RepoScope,
  deps: SignInDeps,
): AuthRepository {
  async function registrations(userId: string | null, status?: MemberRegistration['status']) {
    const rows = unwrap(
      await client.rpc('member_registrations', {
        ...(userId ? { p_user: userId } : {}),
        ...(status ? { p_status: status } : {}),
      }),
    ) as unknown as RegistrationJson[];
    return rows.map(toRegistration);
  }

  async function details(userId: string): Promise<AccountDetails | null> {
    if (!isUuid(userId)) return null;
    const row = unwrap(
      await client.rpc('account_details', { p_user: userId }),
    ) as unknown as DetailsJson | null;
    return row ? toDetails(userId, row) : null;
  }

  async function admins(): Promise<AdminAccount[]> {
    return (unwrap(await client.rpc('admin_accounts')) as unknown as AdminJson[]).map(toAdmin);
  }

  return {
    // ─── Who is signed in ───
    /** One read: null for a visitor (the public role may not call it), an expired token or an account being deleted. */
    async getSession() {
      try {
        const row = unwrap(await client.rpc('my_session')) as unknown as SessionJson | null;
        return row ? toSession(row) : null;
      } catch (error) {
        // A visitor has no right to the function; an expired token is "not signed in", not a failure.
        if (
          isDataError(error, 'forbidden') ||
          (error instanceof DataError && /^PGRST30[1-3]$/.test(error.code ?? ''))
        )
          return null;
        throw error;
      }
    },
    ...createSignInMethods(deps, client),
    requestPasswordReset: notYet('requestPasswordReset'),
    registerMember: notYet('registerMember'),
    confirmEmail: notYet('confirmEmail'),
    resendConfirmation: notYet('resendConfirmation'),
    peekToken: notYet('peekToken'),
    resetPassword: notYet('resetPassword'),

    // ─── My account ───
    getAccountDetails: details,
    async updateAccountDetails(userId, patch) {
      if (!isUuid(userId)) return null;
      const update: { phone?: string; year_of_study?: MemberYear } = {};
      if (patch.phone !== undefined) update.phone = patch.phone.trim();
      if (patch.year !== undefined) update.year_of_study = patch.year;
      if (Object.keys(update).length > 0) {
        const rows = unwrap(
          await client.from('member_accounts').update(update).eq('profile_id', userId).select('profile_id'),
        );
        if (rows.length === 0) return null;
      }
      return details(userId);
    },
    async usernameTaken(userId, username) {
      return unwrap(
        await client.rpc('username_taken', {
          p_username: username,
          ...(isUuid(userId) ? { p_except: userId } : {}),
        }),
      );
    },
    async updateIdentity(userId, patch) {
      if (!isUuid(userId)) return 'not_found';
      const update: { full_name?: string; username?: string } = {};
      if (patch.name !== undefined) update.full_name = patch.name.trim();
      if (patch.username !== undefined) update.username = patch.username;
      try {
        const rows = unwrap(await client.from('profiles').update(update).eq('id', userId).select('id'));
        return rows.length === 0 ? 'not_found' : 'ok';
      } catch (error) {
        if (isDataError(error, 'conflict')) return 'taken';
        throw error;
      }
    },
    verifyPassword: notYet('verifyPassword'),
    changePassword: notYet('changePassword'),
    requestEmailChange: notYet('requestEmailChange'),
    confirmEmailChange: notYet('confirmEmailChange'),
    deleteAccount: () =>
      Promise.reject(
        new NotImplementedError(
          'auth.deleteAccount is the account-deletion port (members/data/account-deletion.ts)',
        ),
      ),
    async exportAccount(userId): Promise<AccountExport | null> {
      const own = await details(userId);
      if (!own) return null;
      const profile = unwrap(await client.from('profiles').select('full_name, username').eq('id', userId));
      const [registration] = await registrations(userId);
      return {
        account: {
          userId,
          name: profile[0]?.full_name ?? '',
          email: own.email,
          username: profile[0]?.username ?? '',
        },
        registration: registration ?? null,
        details: own,
      };
    },

    // ─── Approvals › Member registrations ───
    listRegistrations: (input = {}) => registrations(null, input.status),
    async getRegistration(userId) {
      return isUuid(userId) ? ((await registrations(userId))[0] ?? null) : null;
    },
    async decideRegistration({ userId, decision, reason }) {
      if (!isUuid(userId)) return { status: 'not_found' };
      if (!(await registrations(userId))[0]) return { status: 'not_found' };
      const result = unwrap(
        await client.rpc('decide_member_registrations', {
          p_ids: [userId],
          p_decision: decision,
          p_reason: reason,
        }),
      ) as unknown as { decided: string[] };
      if (!result.decided.includes(userId)) return { status: 'already_decided' };
      const registration = (await registrations(userId))[0];
      return registration ? { status: 'decided', registration } : { status: 'not_found' };
    },
    /** Profiles are rows of their own on a database, so there is nothing to derive them from. */
    approvedMemberIdentities: () => Promise.resolve([]),
    async pendingRegistrationSummary() {
      const pending = await registrations(null, 'pending');
      return { count: pending.length, oldestAt: pending[0]?.submittedAt ?? null };
    },

    // ─── Admin users & roles ───
    listAdmins: admins,
    inviteAdmin: notYet('inviteAdmin'),
    async updateAdmin(userId, patch) {
      if (!isUuid(userId)) return null;
      const changed = unwrap(
        await client.rpc('admin_update_role', {
          p_user: userId,
          ...(patch.role ? { p_role: patch.role } : {}),
          ...(patch.managedEventIds ? { p_events: patch.managedEventIds.filter(isUuid) } : {}),
        }),
      );
      return changed ? ((await admins()).find((account) => account.userId === userId) ?? null) : null;
    },
    async removeAdmin(userId) {
      return isUuid(userId) ? unwrap(await client.rpc('admin_remove_role', { p_user: userId })) : false;
    },
    resendInvite: notYet('resendInvite'),
  };
}
