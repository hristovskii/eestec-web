import type { MemberConsents, MineContext, Profile } from '../types';

/** Every choice off: what a person has before they have made one. */
export const NO_CONSENTS: MemberConsents = {
  newsletter: false,
  galleryName: false,
  cvOptIn: false,
  cvConsentAt: null,
};

/** The profile a person has before anything is stored: what they gave at sign-up, no team, member since then. */
export function profileFromContext(who: MineContext): Profile {
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
