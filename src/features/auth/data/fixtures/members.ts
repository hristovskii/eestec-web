// SAMPLE DATA — people and states from handoff/design-source (AuthForm, AdminDashboard "Approvals").
// Elena Petrovska is the canvas's pending member (she is also the "Pending member" persona).
// "Daniel Ristov · FEEIT, 2nd year" is the other member row of the canvas dashboard; the canvas also
// calls him the event-manager persona, so here he is a second, separate account waiting for approval
// (same name, other e-mail). The three tokens exist so the expired and valid link screens can be
// opened without waiting 24 hours. The e-mail address of Daniel and all tokens are mine.
import type { MemberRegistration, MemberYear } from '../../types';
import type { AccountRecord } from './accounts';

export const registrationsFixture: MemberRegistration[] = [
  {
    userId: 'u-elena',
    name: 'Elena Petrovska',
    email: 'elena.p@students.finki.ukim.mk',
    faculty: 'FINKI',
    year: '1',
    phone: '',
    visibility: 'members',
    photoId: null,
    status: 'pending',
    locale: 'en',
    submittedAt: '2026-10-04T11:45:00+02:00',
    confirmedAt: '2026-10-04T11:52:00+02:00',
    decidedAt: null,
    rejectionReason: null,
  },
  {
    userId: 'u-daniel-feeit',
    name: 'Daniel Ristov',
    email: 'daniel.ristov@students.feit.ukim.edu.mk',
    faculty: 'FEEIT',
    year: '2',
    phone: '070 123 456',
    visibility: 'members',
    photoId: null,
    status: 'pending',
    locale: 'en',
    submittedAt: '2026-10-02T17:00:00+02:00',
    confirmedAt: '2026-10-02T17:20:00+02:00',
    decidedAt: null,
    rejectionReason: null,
  },
];

/** The accounts behind the registrations that are not already a persona. */
export const memberAccountsFixture: AccountRecord[] = [
  {
    personaId: 'pending-daniel',
    userId: 'u-daniel-feeit',
    name: 'Daniel Ristov',
    initials: 'DR',
    username: 'daniel-ristov-2',
    email: 'daniel.ristov@students.feit.ukim.edu.mk',
    headline: 'FEEIT · 2nd year',
    memberStatus: 'pending',
    adminRole: null,
    managedEventIds: [],
    twoFactor: 'off',
    status: 'active',
    lastActiveAt: null,
    invitedAt: null,
  },
];

export const tokensFixture = [
  // An expired confirmation link and an expired reset link, and a reset link that works (Marija).
  {
    token: 'sample-expired-confirm',
    kind: 'confirm' as const,
    userId: 'u-elena',
    email: 'elena.p@students.finki.ukim.mk',
    expiresAt: '2026-09-01T00:00:00+02:00',
    usedAt: null,
  },
  {
    token: 'sample-expired-reset',
    kind: 'reset' as const,
    userId: 'u-marija',
    email: 'marija.s@students.feit.ukim.edu.mk',
    expiresAt: '2026-09-01T00:00:00+02:00',
    usedAt: null,
  },
  {
    token: 'sample-valid-reset',
    kind: 'reset' as const,
    userId: 'u-marija',
    email: 'marija.s@students.feit.ukim.edu.mk',
    expiresAt: '2099-01-01T00:00:00+02:00',
    usedAt: null,
  },
];

/**
 * SAMPLE DATA — the contact details and dates of the sample persona on /profile
 * (handoff/design-source/MyProfile.dc.html): phone "070 123 456", 3rd year, account consent given on
 * 12 Oct 2023, password last changed "4 months ago" (counted from the sample date, 8 Jul 2026).
 * Marija has no registration record, so these live here.
 */
export const accountDetailsFixture: Record<
  string,
  { phone?: string; year?: MemberYear; dataConsentAt?: string; passwordChangedAt?: string }
> = {
  'u-marija': {
    phone: '070 123 456',
    year: '3',
    dataConsentAt: '2023-10-12T18:00:00+02:00',
    passwordChangedAt: '2026-07-08T10:00:00+02:00',
  },
};
