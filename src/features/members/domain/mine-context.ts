import type { MineContext, ProfileVisibility } from '../types';

/** The few facts of the sign-up record that /profile needs (the full record stays in `auth`). */
export type SignUpFacts = {
  faculty: string;
  /** 'members' is what `auth` calls "Members only". */
  visibility: 'public' | 'members';
  photoUrl: string | null;
  /** ISO date-time the account was approved, or created while it is still pending. */
  since: string;
};

type SessionFacts = {
  userId: string;
  name: string;
  username: string;
  memberStatus: 'pending' | 'active' | 'alumni' | null;
};

/** Who the signed-in member is, for the repository (see `MineContext`). */
export function toMineContext(
  session: SessionFacts,
  signUp: SignUpFacts | null,
  fallbackSince: string,
): MineContext {
  const visibility: ProfileVisibility = signUp?.visibility === 'public' ? 'public' : 'members_only';
  return {
    userId: session.userId,
    name: session.name,
    username: session.username,
    faculty: signUp?.faculty ?? '',
    visibility,
    photoUrl: signUp?.photoUrl ?? null,
    since: signUp?.since ?? fallbackSince,
    pending: session.memberStatus === 'pending',
  };
}
