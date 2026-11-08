import 'server-only';

import { createHash } from 'node:crypto';

import { mockTable } from '@/shared/data/mock/store';
import { initials } from '@/shared/lib/initials';
import { slugify } from '@/shared/lib/slug';
import { localizedPath } from '@/shared/seo/alternates';

import { mockSignInBlocked } from '../availability';
import { type AttemptLog, emptyLog, lockState, recordFailure } from '../domain/lockout';
import { newToken, type TokenRecord, tokenState } from '../domain/tokens';
import type {
  AccountDetails,
  AccountDetailsPatch,
  AccountExport,
  ApprovedMemberIdentity,
  ConfirmEmailChangeResult,
  ConfirmResult,
  DeleteAccountResult,
  PasswordCheck,
  RequestEmailChangeResult,
  DecideRegistrationResult,
  MemberRegistration,
  MemberYear,
  RegisterMemberInput,
  RegisterResult,
  ResetPasswordResult,
  SignInMemberResult,
  TokenKind,
  TokenPeek,
} from '../types';
import type { AuthRepository } from './auth.repository';
import type { AccountRecord } from './fixtures/accounts';
import { accountDetailsFixture, registrationsFixture, tokensFixture } from './fixtures/members';
import { SAMPLE_PASSWORD } from './fixtures/personas';
import { deleteMockMemberPhoto, photoUrl, saveMockMemberPhoto } from './member-photos';
import { sendMockMail } from './mailbox';

// The member side of the mock: registrations, e-mail links and passwords. Registered people get an
// account with a persona cookie value (`m-<userId>`), so they sign in exactly like the sample
// personas. Passwords are kept as a salted SHA-256 (never the text); the sample personas keep the
// sample password until they choose one.

type MemberStore = {
  registrations: MemberRegistration[];
  tokens: TokenRecord[];
  /** userId → hash, for accounts that chose their own password. */
  passwords: Record<string, string>;
  /** userId → what the member changed (or the sample's) on top of the sign-up record. */
  details: Record<
    string,
    { phone?: string; year?: MemberYear; dataConsentAt?: string; passwordChangedAt?: string }
  >;
};

const YEAR_LABEL: Record<MemberYear, string> = {
  '1': '1st year',
  '2': '2nd year',
  '3': '3rd year',
  '4': '4th year',
  master: 'Master’s',
  phd: 'PhD',
};

const hash = (password: string, userId: string) =>
  createHash('sha256').update(`${userId}:${password}`).digest('hex');

export type MemberContext = {
  accounts: AccountRecord[];
  attempts: { byEmail: Record<string, AttemptLog> };
  setSession: (personaId: string, remember: boolean) => Promise<void>;
};

const lockedResult = (until: Date, now: Date) =>
  ({
    status: 'locked',
    until: until.toISOString(),
    minutes: Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000)),
  }) as const;

export function createMemberMethods({ accounts, attempts, setSession }: MemberContext) {
  const store = mockTable<MemberStore>('memberAuth', () => ({
    registrations: registrationsFixture.map((registration) => ({ ...registration })),
    tokens: tokensFixture.map((token) => ({ ...token })),
    passwords: {},
    details: structuredClone(accountDetailsFixture),
  }));

  const accountByEmail = (email: string) =>
    accounts.find((account) => account.email.toLowerCase() === email.trim().toLowerCase());
  const registrationOf = (userId: string) => store.registrations.find((item) => item.userId === userId);
  const passwordMatches = (account: AccountRecord, password: string) => {
    const own = store.passwords[account.userId];
    return own ? own === hash(password, account.userId) : password === SAMPLE_PASSWORD;
  };

  const issue = (kind: TokenKind, who: { userId: string; email: string }, now: Date) => {
    // A new link replaces the older unused ones of the same kind.
    store.tokens = store.tokens.filter(
      (token) => !(token.userId === who.userId && token.kind === kind && token.usedAt === null),
    );
    const record = newToken(kind, who, now);
    store.tokens.push(record);
    return record;
  };

  const linkFor = (kind: TokenKind, token: string, locale: 'mk' | 'en') => {
    if (kind === 'confirm') return `/auth/confirm?token=${token}`;
    // A new address is confirmed with the same route as the sign-up e-mail; `type` tells them apart.
    if (kind === 'email_change') return `/auth/confirm?token=${token}&type=email&lang=${locale}`;
    return `${localizedPath('/reset-password', locale)}?token=${token}`;
  };

  const sendConfirmation = (registration: MemberRegistration, now: Date) => {
    const token = issue('confirm', registration, now);
    sendMockMail({
      to: registration.email,
      kind: 'confirm',
      subject: 'Confirm your e-mail',
      link: linkFor('confirm', token.token, registration.locale),
      reason: null,
      sentAt: now.toISOString(),
    });
  };

  const usernameFor = (name: string) => {
    const base = slugify(name) || 'member';
    let candidate = base;
    for (let n = 2; accounts.some((account) => account.username === candidate); n += 1)
      candidate = `${base}-${n}`;
    return candidate;
  };

  const peek = (token: string, kind: TokenKind, now: Date): TokenPeek => {
    const record = store.tokens.find((item) => item.token === token);
    const state = tokenState(record, kind, now);
    if (state !== 'valid' || !record) return { state: state === 'valid' ? 'invalid' : state };
    const account = accounts.find((item) => item.userId === record.userId);
    const registration = registrationOf(record.userId);
    return {
      state: 'valid',
      email: record.email,
      name: account?.name ?? registration?.name ?? '',
      locale: registration?.locale ?? 'mk',
    };
  };

  /** The current password check, with the same lockout as sign-in (keyed by the account's e-mail). */
  const passwordAttempt = (account: AccountRecord, password: string, now: Date): PasswordCheck => {
    const key = account.email.toLowerCase();
    const log = attempts.byEmail[key] ?? emptyLog();
    const state = lockState(log, now);
    if (state.locked) return { status: 'locked', minutes: lockedResult(state.until!, now).minutes };
    if (!passwordMatches(account, password)) {
      const next = recordFailure(log, now);
      attempts.byEmail[key] = next;
      const after = lockState(next, now);
      return after.locked
        ? { status: 'locked', minutes: lockedResult(after.until!, now).minutes }
        : { status: 'invalid' };
    }
    delete attempts.byEmail[key];
    return { status: 'ok' };
  };

  const detailsOf = (userId: string): AccountDetails | null => {
    const account = accounts.find((item) => item.userId === userId);
    if (!account) return null;
    const registration = registrationOf(userId);
    const own = store.details[userId] ?? {};
    return {
      userId,
      email: account.email,
      phone: own.phone ?? registration?.phone ?? '',
      year: own.year ?? registration?.year ?? null,
      dataConsentAt: own.dataConsentAt ?? registration?.submittedAt ?? null,
      passwordChangedAt: own.passwordChangedAt ?? registration?.submittedAt ?? null,
    };
  };

  return {
    getAccountDetails(userId: string): Promise<AccountDetails | null> {
      return Promise.resolve(detailsOf(userId));
    },

    updateAccountDetails(userId: string, patch: AccountDetailsPatch): Promise<AccountDetails | null> {
      if (!detailsOf(userId)) return Promise.resolve(null);
      const own = (store.details[userId] ??= {});
      if (patch.phone !== undefined) own.phone = patch.phone.trim();
      if (patch.year !== undefined) own.year = patch.year;
      return Promise.resolve(detailsOf(userId));
    },

    usernameTaken(userId: string, username: string): Promise<boolean> {
      return Promise.resolve(
        accounts.some((item) => item.userId !== userId && item.username !== '' && item.username === username),
      );
    },

    updateIdentity(
      userId: string,
      patch: { name?: string; username?: string },
    ): Promise<'ok' | 'taken' | 'not_found'> {
      const account = accounts.find((item) => item.userId === userId);
      if (!account) return Promise.resolve('not_found');
      if (
        patch.username !== undefined &&
        accounts.some((item) => item.userId !== userId && item.username === patch.username)
      )
        return Promise.resolve('taken');
      if (patch.username !== undefined) account.username = patch.username;
      if (patch.name !== undefined) {
        account.name = patch.name.trim();
        account.initials = initials(account.name);
      }
      return Promise.resolve('ok');
    },

    verifyPassword({
      userId,
      password,
      now,
    }: {
      userId: string;
      password: string;
      now: Date;
    }): Promise<PasswordCheck> {
      const account = accounts.find((item) => item.userId === userId);
      return Promise.resolve(account ? passwordAttempt(account, password, now) : { status: 'invalid' });
    },

    changePassword({
      userId,
      current,
      next,
      now,
    }: {
      userId: string;
      current: string;
      next: string;
      now: Date;
    }): Promise<PasswordCheck> {
      const account = accounts.find((item) => item.userId === userId);
      if (!account) return Promise.resolve({ status: 'invalid' });
      const check = passwordAttempt(account, current, now);
      if (check.status !== 'ok') return Promise.resolve(check);
      store.passwords[userId] = hash(next, userId);
      (store.details[userId] ??= {}).passwordChangedAt = now.toISOString();
      return Promise.resolve(check);
    },

    requestEmailChange({
      userId,
      newEmail,
      password,
      locale,
      now,
    }: {
      userId: string;
      newEmail: string;
      password: string;
      locale: 'mk' | 'en';
      now: Date;
    }): Promise<RequestEmailChangeResult> {
      const account = accounts.find((item) => item.userId === userId);
      if (!account) return Promise.resolve({ status: 'invalid' });
      const check = passwordAttempt(account, password, now);
      if (check.status !== 'ok') return Promise.resolve(check);
      const target = newEmail.trim();
      if (target.toLowerCase() === account.email.toLowerCase()) return Promise.resolve({ status: 'same' });
      if (accountByEmail(target)) return Promise.resolve({ status: 'email_taken' });
      const token = issue('email_change', { userId, email: target }, now);
      sendMockMail({
        to: target,
        kind: 'email_change',
        subject: 'Confirm your new e-mail address',
        link: linkFor('email_change', token.token, locale),
        reason: null,
        sentAt: now.toISOString(),
      });
      return Promise.resolve({ status: 'sent' });
    },

    confirmEmailChange({ token, now }: { token: string; now: Date }): Promise<ConfirmEmailChangeResult> {
      if (peek(token, 'email_change', now).state !== 'valid') return Promise.resolve({ status: 'expired' });
      const record = store.tokens.find((item) => item.token === token)!;
      const account = accounts.find((item) => item.userId === record.userId);
      const taken = accountByEmail(record.email);
      if (!account || (taken && taken.userId !== account.userId))
        return Promise.resolve({ status: 'expired' });
      record.usedAt = now.toISOString();
      // Failed tries belong to the old address.
      delete attempts.byEmail[account.email.toLowerCase()];
      account.email = record.email;
      const registration = registrationOf(account.userId);
      if (registration) registration.email = record.email;
      return Promise.resolve({ status: 'changed', email: record.email });
    },

    deleteAccount({ userId, now }: { userId: string; now: Date }): Promise<DeleteAccountResult> {
      const index = accounts.findIndex((item) => item.userId === userId);
      const account = accounts[index];
      if (!account) return Promise.resolve({ status: 'not_found' });
      if (account.adminRole) return Promise.resolve({ status: 'staff' });
      const registration = registrationOf(userId);
      const locale = registration?.locale ?? 'mk';
      if (registration?.photoId) deleteMockMemberPhoto(registration.photoId);
      accounts.splice(index, 1);
      store.registrations = store.registrations.filter((item) => item.userId !== userId);
      store.tokens = store.tokens.filter((item) => item.userId !== userId);
      delete store.passwords[userId];
      delete store.details[userId];
      delete attempts.byEmail[account.email.toLowerCase()];
      sendMockMail({
        to: account.email,
        kind: 'deleted',
        subject: 'Your account is deleted',
        link: null,
        reason: null,
        sentAt: now.toISOString(),
      });
      return Promise.resolve({ status: 'deleted', name: account.name, email: account.email, locale });
    },

    exportAccount(userId: string): Promise<AccountExport | null> {
      const account = accounts.find((item) => item.userId === userId);
      const details = detailsOf(userId);
      if (!account || !details) return Promise.resolve(null);
      const registration = registrationOf(userId);
      return Promise.resolve({
        account: { userId, name: account.name, email: account.email, username: account.username },
        registration: registration ? { ...registration } : null,
        details,
      });
    },

    registerMember(input: RegisterMemberInput): Promise<RegisterResult> {
      if (mockSignInBlocked()) return Promise.resolve({ status: 'unavailable' });
      const existing = accountByEmail(input.email);
      const earlier = existing ? registrationOf(existing.userId) : undefined;
      // Still waiting for the e-mail link: "Wrong e-mail? Change it" and sending again is allowed.
      if (existing && earlier?.status !== 'awaiting_confirmation')
        return Promise.resolve({ status: 'email_taken' });

      const photoId = input.photo ? saveMockMemberPhoto(input.photo) : null;

      const fields = {
        name: input.name.trim(),
        email: input.email.trim(),
        faculty: input.faculty,
        year: input.year,
        phone: input.phone.trim(),
        visibility: input.visibility,
        photoId,
        locale: input.locale,
      };
      let registration: MemberRegistration;
      if (existing && earlier) {
        Object.assign(earlier, fields, { submittedAt: input.now.toISOString() });
        Object.assign(existing, { name: fields.name, email: fields.email, initials: initials(fields.name) });
        store.passwords[existing.userId] = hash(input.password, existing.userId);
        registration = earlier;
      } else {
        const userId = `u-${crypto.randomUUID()}`;
        registration = {
          userId,
          ...fields,
          status: 'awaiting_confirmation',
          submittedAt: input.now.toISOString(),
          confirmedAt: null,
          decidedAt: null,
          rejectionReason: null,
        };
        store.registrations.push(registration);
        accounts.push({
          personaId: `m-${userId}`,
          userId,
          name: fields.name,
          initials: initials(fields.name),
          username: '',
          email: fields.email,
          headline: '',
          memberStatus: null,
          adminRole: null,
          managedEventIds: [],
          twoFactor: 'off',
          status: 'active',
          lastActiveAt: null,
          invitedAt: null,
        });
        store.passwords[userId] = hash(input.password, userId);
      }
      sendConfirmation(registration, input.now);
      return Promise.resolve({ status: 'registered', userId: registration.userId });
    },

    async confirmEmail({ token, now }: { token: string; now: Date }): Promise<ConfirmResult> {
      const seen = peek(token, 'confirm', now);
      if (seen.state !== 'valid') return { status: 'expired' };
      const record = store.tokens.find((item) => item.token === token)!;
      record.usedAt = now.toISOString();
      const registration = registrationOf(record.userId);
      const account = accounts.find((item) => item.userId === record.userId);
      if (!registration || !account) return { status: 'expired' };
      if (registration.status === 'awaiting_confirmation') {
        registration.status = 'pending';
        registration.confirmedAt = now.toISOString();
        account.memberStatus = 'pending';
        account.username = usernameFor(account.name);
        account.headline = `${registration.faculty} · ${YEAR_LABEL[registration.year]}`;
      }
      if (account.personaId) await setSession(account.personaId, false);
      return { status: 'confirmed' };
    },

    resendConfirmation({ email, now }: { email: string; now: Date }): Promise<void> {
      const account = accountByEmail(email);
      const registration = account ? registrationOf(account.userId) : undefined;
      if (registration?.status === 'awaiting_confirmation') sendConfirmation(registration, now);
      return Promise.resolve();
    },

    async signInMember({
      email,
      password,
      remember,
      now,
    }: {
      email: string;
      password: string;
      remember: boolean;
      now: Date;
    }): Promise<SignInMemberResult> {
      if (mockSignInBlocked()) return { status: 'unavailable' };
      const key = email.trim().toLowerCase();
      const log = attempts.byEmail[key] ?? emptyLog();
      const state = lockState(log, now);
      if (state.locked) return lockedResult(state.until!, now);

      const account = accountByEmail(key);
      if (!account?.personaId || account.status !== 'active' || !passwordMatches(account, password)) {
        const next = recordFailure(log, now);
        attempts.byEmail[key] = next;
        const after = lockState(next, now);
        return after.locked ? lockedResult(after.until!, now) : { status: 'invalid' };
      }
      delete attempts.byEmail[key];

      const registration = registrationOf(account.userId);
      if (registration?.status === 'rejected')
        return { status: 'rejected', reason: registration.rejectionReason };
      if (registration?.status === 'awaiting_confirmation') return { status: 'unconfirmed' };
      // Board accounts sign in at /admin/login: a super admin's 2-step check can't be skipped here.
      if (account.adminRole) return { status: 'use_admin_login' };
      if (!account.memberStatus) return { status: 'invalid' };

      account.lastActiveAt = now.toISOString();
      await setSession(account.personaId, remember);
      return { status: 'signed_in', memberStatus: account.memberStatus };
    },

    requestPasswordReset({
      email,
      locale,
      now,
    }: {
      email: string;
      locale?: 'mk' | 'en';
      now: Date;
    }): Promise<void> {
      const account = accountByEmail(email);
      const registration = account ? registrationOf(account.userId) : undefined;
      // Unknown, unconfirmed or rejected: nothing is sent, and the answer is the same as for anyone.
      if (!account || account.status !== 'active') return Promise.resolve();
      if (
        registration &&
        (registration.status === 'awaiting_confirmation' || registration.status === 'rejected')
      )
        return Promise.resolve();
      const token = issue('reset', account, now);
      sendMockMail({
        to: account.email,
        kind: 'reset',
        subject: 'Choose a new password',
        link: linkFor('reset', token.token, locale ?? registration?.locale ?? 'mk'),
        reason: null,
        sentAt: now.toISOString(),
      });
      return Promise.resolve();
    },

    peekToken({ token, kind, now }: { token: string; kind: TokenKind; now: Date }): Promise<TokenPeek> {
      return Promise.resolve(peek(token, kind, now));
    },

    async resetPassword({
      token,
      password,
      now,
    }: {
      token: string;
      password: string;
      now: Date;
    }): Promise<ResetPasswordResult> {
      if (peek(token, 'reset', now).state !== 'valid') return { status: 'expired' };
      const record = store.tokens.find((item) => item.token === token)!;
      const account = accounts.find((item) => item.userId === record.userId);
      if (!account) return { status: 'expired' };
      record.usedAt = now.toISOString();
      store.passwords[account.userId] = hash(password, account.userId);
      delete attempts.byEmail[account.email.toLowerCase()];
      // Signing in again everywhere is what the backend does; here only this browser is signed in.
      if (account.adminRole || !account.memberStatus || !account.personaId)
        return { status: 'ok', signedIn: false };
      await setSession(account.personaId, false);
      return { status: 'ok', signedIn: true };
    },

    listRegistrations({ status }: { status?: MemberRegistration['status'] } = {}): Promise<
      MemberRegistration[]
    > {
      return Promise.resolve(
        store.registrations
          .filter((item) => !status || item.status === status)
          .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
          .map((item) => ({ ...item })),
      );
    },

    getRegistration(userId: string): Promise<MemberRegistration | null> {
      const found = registrationOf(userId);
      return Promise.resolve(found ? { ...found } : null);
    },

    decideRegistration({
      userId,
      decision,
      reason,
      notify = true,
      now,
    }: {
      userId: string;
      decision: 'approve' | 'reject';
      reason: string;
      notify?: boolean;
      now: Date;
    }): Promise<DecideRegistrationResult> {
      const registration = registrationOf(userId);
      const account = accounts.find((item) => item.userId === userId);
      if (!registration || !account) return Promise.resolve({ status: 'not_found' });
      if (registration.status !== 'pending') return Promise.resolve({ status: 'already_decided' });
      registration.decidedAt = now.toISOString();
      if (decision === 'approve') {
        registration.status = 'active';
        account.memberStatus = 'active';
        if (notify)
          sendMockMail({
            to: registration.email,
            kind: 'approved',
            subject: 'Your member account is approved',
            link: localizedPath('/login', registration.locale),
            reason: null,
            sentAt: now.toISOString(),
          });
      } else {
        registration.status = 'rejected';
        registration.rejectionReason = reason.trim() || null;
        account.memberStatus = null;
        if (notify)
          sendMockMail({
            to: registration.email,
            kind: 'rejected',
            subject: 'About your member account',
            link: null,
            reason: registration.rejectionReason,
            sentAt: now.toISOString(),
          });
      }
      return Promise.resolve({ status: 'decided', registration: { ...registration } });
    },

    approvedMemberIdentities(): Promise<ApprovedMemberIdentity[]> {
      const identities: ApprovedMemberIdentity[] = [];
      for (const item of store.registrations) {
        const account = accounts.find((entry) => entry.userId === item.userId);
        if (item.status !== 'active' || !account || !item.decidedAt) continue;
        identities.push({
          userId: item.userId,
          name: item.name,
          username: account.username,
          faculty: item.faculty,
          year: item.year,
          visibility: item.visibility,
          photoUrl: item.photoId ? photoUrl(item.photoId) : null,
          approvedAt: item.decidedAt,
        });
      }
      return Promise.resolve(identities);
    },

    pendingRegistrationSummary(): Promise<{ count: number; oldestAt: string | null }> {
      const pending = store.registrations.filter((item) => item.status === 'pending');
      const oldest = pending.map((item) => item.submittedAt).sort()[0] ?? null;
      return Promise.resolve({ count: pending.length, oldestAt: oldest });
    },
  } satisfies Partial<AuthRepository>;
}
