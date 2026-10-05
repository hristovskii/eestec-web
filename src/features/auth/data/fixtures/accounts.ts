// SAMPLE DATA — handoff/design-source/AdminUsers.dc.html (2-step status, last active, invites),
// for the sample personas plus the two admins who only appear there (Ivana Kostova, Petar Kolev).
// The canvas also lists "Marija Stojanovska · Editor"; Marija is the member-only sample persona
// everywhere else, so that row is left out (one consistent dataset).
import type { AdminAccount, Session, TwoFactorStatus } from '../../types';
import { type Persona, personas } from './personas';

/** A stored account: who the person is, their admin role (if any) and sign-in facts. */
export type AccountRecord = Session & {
  /** Mock session cookie value; accounts without one can't be signed in as (e.g. invited). */
  personaId: string | null;
  twoFactor: TwoFactorStatus;
  status: AdminAccount['status'];
  lastActiveAt: string | null;
  invitedAt: string | null;
};

const meta: Record<string, Pick<AccountRecord, 'twoFactor' | 'lastActiveAt'>> = {
  'super-admin': { twoFactor: 'on', lastActiveAt: '2026-10-04T18:18:00+02:00' },
  editor: { twoFactor: 'on', lastActiveAt: '2026-10-03T21:14:00+02:00' },
  'event-manager': { twoFactor: 'off', lastActiveAt: '2026-10-02T16:40:00+02:00' },
};

const fromPersona = ({ label: _label, ...persona }: Persona): AccountRecord => ({
  ...persona,
  twoFactor: meta[persona.personaId]?.twoFactor ?? 'off',
  status: 'active',
  lastActiveAt: meta[persona.personaId]?.lastActiveAt ?? null,
  invitedAt: null,
});

export const accountsFixture: AccountRecord[] = [
  ...personas.map(fromPersona),
  {
    personaId: 'editor-ivana',
    userId: 'u-ivana',
    name: 'Ivana Kostova',
    initials: 'IK',
    username: 'ivana-kostova',
    email: 'partners@eestec.mk',
    headline: 'External relations & partners · Board 2026/2027',
    memberStatus: 'active',
    adminRole: 'editor',
    managedEventIds: [],
    twoFactor: 'on',
    status: 'active',
    lastActiveAt: '2026-09-30T12:40:00+02:00',
    invitedAt: null,
  },
  {
    personaId: null,
    userId: 'u-petar',
    name: 'Petar Kolev',
    initials: 'PK',
    username: 'petar-kolev',
    email: 'petar.k@students.feit.ukim.edu.mk',
    headline: '',
    memberStatus: null,
    adminRole: 'event_manager',
    managedEventIds: ['ev-new-year-social-2026'],
    twoFactor: 'not_set_up',
    status: 'invited',
    lastActiveAt: null,
    invitedAt: '2026-10-02T11:30:00+02:00',
  },
];
