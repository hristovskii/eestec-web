import type { Audience, Profile } from '../types';

// Who may see which profile. This is the one rule behind /members and /members/<username>; the
// repository applies it, so a screen can't forget it (in Supabase it becomes row-level security).

type Visible = Pick<Profile, 'status' | 'visibility'>;

/** Only active members and alumni have a page. pending / rejected people are not profiles at all. */
export const hasPage = (profile: Pick<Profile, 'status'>) =>
  profile.status === 'active' || profile.status === 'alumni';

/** Members (and the board, who always see everything members see) also see members-only profiles. */
export function canSee(audience: Audience, profile: Visible): boolean {
  if (!hasPage(profile)) return false;
  return audience === 'member' || profile.visibility === 'public';
}

/**
 * The person exists but this viewer may only see the name, the team and a lock: a visitor opening a
 * members-only profile by its address.
 */
export const isRestrictedFor = (audience: Audience, profile: Visible) =>
  hasPage(profile) && !canSee(audience, profile);
