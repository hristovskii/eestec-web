import 'server-only';

import type { AccountDetails, Session } from '@/features/auth';
import { getAccountDetails, getMemberRegistration, photoUrl } from '@/features/auth/server';
import { now } from '@/shared/lib/now';

import { membersRepository } from './data';
import { type SignUpFacts, toMineContext } from './domain/mine-context';
import type { MineContext, MineView } from './types';

// "My profile" (/profile): the signed-in member's own data. It depends on who is signed in, so
// nothing here is cached. The caller has checked the session (requireMember / currentMember).

/** Who the member is for the repository: the session plus what they gave at sign-up. */
export async function getMineContext(session: Session): Promise<MineContext> {
  const registration = await getMemberRegistration(session.userId);
  const signUp: SignUpFacts | null = registration
    ? {
        faculty: registration.faculty,
        visibility: registration.visibility,
        photoUrl: registration.photoId ? photoUrl(registration.photoId) : null,
        since: registration.decidedAt ?? registration.submittedAt,
      }
    : null;
  return toMineContext(session, signUp, now().toISOString());
}

export type MyProfileData = { context: MineContext; mine: MineView; details: AccountDetails };

/** Everything /profile shows about the member except applications (those come from `applications`). */
export async function getMyProfile(session: Session): Promise<MyProfileData | null> {
  const context = await getMineContext(session);
  const [mine, details] = await Promise.all([
    (await membersRepository('session')).getMine(context, now().getFullYear()),
    getAccountDetails(session.userId),
  ]);
  return details ? { context, mine, details } : null;
}
