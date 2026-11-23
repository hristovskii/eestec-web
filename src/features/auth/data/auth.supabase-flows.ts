import 'server-only';

import { createHash } from 'node:crypto';

import { unwrap } from '@/shared/data/supabase/errors';
import { isDataError } from '@/shared/data/supabase/errors';
import { slugify } from '@/shared/lib/slug';

import { linkFor } from '../domain/links';
import { newToken } from '../domain/tokens';
import type { TokenKind, TokenPeek } from '../types';
import type { AuthRepository } from './auth.repository';
import type { SignInDeps } from './auth.supabase-sign-in';

/** An e-mail the account flows need sent. The service that sends them is M22; until then the app wiring decides. */
export type AuthMail = {
  to: string;
  kind: 'confirm' | 'reset';
  subject: string;
  /** The address of the button ("/auth/confirm?token=…"). */
  link: string;
  sentAt: string;
};

export type FlowDeps = SignInDeps & { mail: (mail: AuthMail) => Promise<void> };

type UserState = {
  user_id: string;
  email: string;
  confirmed: boolean;
  registered: boolean;
  profile_status: string | null;
  has_role: boolean;
  deleting: boolean;
};

type Peek =
  | { state: 'valid'; user_id: string; email: string; name: string; locale: 'mk' | 'en' }
  | { state: 'expired' | 'invalid' };

const EXTENSION: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const normalized = (email: string) => email.trim().toLowerCase();
/** Only a hash of a link's token is stored: a copy of the table opens nothing. */
const hashOf = (token: string) => createHash('sha256').update(token).digest('hex');

/** A profile address from a name: a slug of 3 to 30 characters (the database adds a number when it is taken). */
function usernameBase(name: string): string {
  const slug = slugify(name)
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/, '');
  return slug.length >= 3 ? slug : `member-${slug || 'x'}`.slice(0, 30);
}

/**
 * Registration and the e-mail links on a database (M21c). The server makes the Auth account with Auth's admin API (nobody
 * signs up with the public key), the SQL functions of 0027 keep the rest in one step, and the links are our own table
 * (`auth_links`) because Auth has one lifetime for every link. Nothing here reveals whether an address has an account,
 * except the sign-up form, which is drawn that way.
 */
export function createFlowMethods(
  deps: FlowDeps,
): Pick<
  AuthRepository,
  | 'registerMember'
  | 'confirmEmail'
  | 'resendConfirmation'
  | 'requestPasswordReset'
  | 'peekToken'
  | 'resetPassword'
> {
  const state = async (email: string) =>
    unwrap(await deps.service().rpc('auth_user_state', { p_email: email })) as unknown as UserState | null;

  /** Makes a link for the person and sends it. A new link replaces the older unused ones of that kind. */
  async function sendLink(
    kind: 'confirm' | 'reset',
    who: { userId: string; email: string },
    locale: 'mk' | 'en',
    now: Date,
  ) {
    const record = newToken(kind, who, now);
    unwrap(
      await deps.service().rpc('auth_link_issue', {
        p_user: who.userId,
        p_kind: kind,
        p_hash: hashOf(record.token),
        p_expires: record.expiresAt,
      }),
    );
    await deps.mail({
      to: who.email,
      kind,
      subject: kind === 'confirm' ? 'Confirm your e-mail' : 'Choose a new password',
      link: linkFor(kind, record.token, locale),
      sentAt: now.toISOString(),
    });
  }

  const localeOf = async (userId: string): Promise<'mk' | 'en'> => {
    const { data } = await deps
      .service()
      .from('member_accounts')
      .select('registration_locale')
      .eq('profile_id', userId)
      .maybeSingle();
    return data?.registration_locale === 'en' ? 'en' : 'mk';
  };

  async function peek(token: string, kind: TokenKind, now: Date): Promise<Peek> {
    return unwrap(
      await deps
        .service()
        .rpc('auth_link_peek', { p_hash: hashOf(token), p_kind: kind, p_now: now.toISOString() }),
    ) as unknown as Peek;
  }

  return {
    async registerMember(input) {
      const service = deps.service();
      const email = normalized(input.email);
      const existing = await state(email);
      // Taken, unless the person never used the link of an earlier try ("wrong e-mail? change it").
      if (existing && (existing.confirmed || !existing.registered || existing.deleting))
        return { status: 'email_taken' };

      let userId: string;
      let created = false;
      if (existing) {
        userId = existing.user_id;
        const updated = await service.auth.admin.updateUserById(userId, { password: input.password });
        if (updated.error) throw updated.error;
      } else {
        const made = await service.auth.admin.createUser({
          email,
          password: input.password,
          email_confirm: false,
        });
        if (made.error) {
          if (made.error.code === 'email_exists') return { status: 'email_taken' };
          throw made.error;
        }
        userId = made.data.user.id;
        created = true;
      }

      let photoPath: string | null = null;
      try {
        if (input.photo) {
          const extension = EXTENSION[input.photo.mimeType];
          if (!extension) throw new Error('This photo type is not accepted');
          photoPath = `${userId}/${crypto.randomUUID()}.${extension}`;
          const stored = await service.storage
            .from('avatars')
            .upload(photoPath, input.photo.bytes, { contentType: input.photo.mimeType });
          if (stored.error) throw stored.error;
        }
        const done = unwrap(
          await service.rpc('register_member', {
            p_user: userId,
            p_name: input.name,
            p_username: usernameBase(input.name),
            p_faculty: input.faculty,
            p_year: input.year,
            p_phone: input.phone,
            p_visibility: input.visibility,
            p_locale: input.locale,
            p_now: input.now.toISOString(),
            ...(input.photo && photoPath
              ? {
                  p_photo: {
                    path: photoPath,
                    mime: input.photo.mimeType,
                    size: input.photo.bytes.byteLength,
                    name: `photo.${EXTENSION[input.photo.mimeType]}`,
                  },
                }
              : {}),
          }),
        ) as unknown as { previous_photo: string | null };
        // The photo of an earlier try is replaced: its file goes now (the queue is the record if this fails).
        if (done.previous_photo) await service.storage.from('avatars').remove([done.previous_photo]);
      } catch (error) {
        if (photoPath) await service.storage.from('avatars').remove([photoPath]);
        if (created) await service.auth.admin.deleteUser(userId);
        if (isDataError(error, 'conflict')) return { status: 'email_taken' };
        throw error;
      }
      await sendLink('confirm', { userId, email }, input.locale, input.now);
      return { status: 'registered', userId };
    },

    async confirmEmail({ token, now }) {
      const service = deps.service();
      const userId = unwrap(
        await service.rpc('auth_link_use', {
          p_hash: hashOf(token),
          p_kind: 'confirm',
          p_now: now.toISOString(),
        }),
      );
      if (!userId) return { status: 'expired' };
      const confirmed = await service.auth.admin.updateUserById(userId, { email_confirm: true });
      if (confirmed.error) throw confirmed.error;
      // "The person is signed in": there is no password at hand, so Auth's own one-time sign-in does it.
      const email = confirmed.data.user.email;
      if (email) {
        const link = await service.auth.admin.generateLink({ type: 'magiclink', email });
        const hashed = link.data.properties?.hashed_token;
        if (hashed) {
          const session = await deps.signInClient(false);
          const opened = await session.auth.verifyOtp({ token_hash: hashed, type: 'magiclink' });
          if (!opened.error) await deps.rememberChoice(false);
        }
      }
      return { status: 'confirmed' };
    },

    async resendConfirmation({ email, now }) {
      const found = await state(email);
      if (!found || found.confirmed || !found.registered || found.deleting) return;
      await sendLink(
        'confirm',
        { userId: found.user_id, email: found.email },
        await localeOf(found.user_id),
        now,
      );
    },

    async requestPasswordReset({ email, locale, now }) {
      const found = await state(email);
      // Unknown, unconfirmed, rejected or leaving: nothing is sent, and the answer is the same as for anyone.
      if (!found || !found.confirmed || found.deleting || found.profile_status === 'rejected') return;
      if (!found.registered && !found.has_role) return;
      await sendLink(
        'reset',
        { userId: found.user_id, email: found.email },
        locale ?? (await localeOf(found.user_id)),
        now,
      );
    },

    async peekToken({ token, kind, now }): Promise<TokenPeek> {
      const seen = await peek(token, kind, now);
      return seen.state === 'valid'
        ? { state: 'valid', email: seen.email, name: seen.name, locale: seen.locale }
        : { state: seen.state };
    },

    async resetPassword({ token, password, now }) {
      const service = deps.service();
      const seen = await peek(token, 'reset', now);
      if (seen.state !== 'valid') return { status: 'expired' };
      const userId = unwrap(
        await service.rpc('auth_link_use', {
          p_hash: hashOf(token),
          p_kind: 'reset',
          p_now: now.toISOString(),
        }),
      );
      if (!userId) return { status: 'expired' };
      const changed = await service.auth.admin.updateUserById(userId, { password });
      if (changed.error) throw changed.error;
      unwrap(await service.rpc('password_reset_done', { p_user: userId, p_now: now.toISOString() }));

      // A member is signed in with the new password; a board account signs in at /admin/login (2-step cannot be skipped).
      const found = await state(seen.email);
      const member =
        found &&
        !found.has_role &&
        (found.profile_status === 'pending' ||
          found.profile_status === 'active' ||
          found.profile_status === 'alumni');
      if (!member) return { status: 'ok', signedIn: false };
      const session = await deps.signInClient(false);
      const opened = await session.auth.signInWithPassword({ email: seen.email, password });
      if (opened.error) return { status: 'ok', signedIn: false };
      await deps.rememberChoice(false);
      return { status: 'ok', signedIn: true };
    },
  };
}
