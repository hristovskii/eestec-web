// SAMPLE DATA — people from handoff/design-source (HeaderStates, AdminUsers, AdminDashboard,
// MyProfileStates). Used only by the mock session (devtools persona switcher, mock admin login).
import type { Session } from '../../types';

export type Persona = Session & { personaId: string; label: string };

/**
 * Mock admin sign-in (test values for this app only, never real credentials): every persona signs
 * in with SAMPLE_PASSWORD; super admins then enter SAMPLE_TOTP_CODE (or a backup code).
 */
export const SAMPLE_PASSWORD = 'eestec-sample';
export const SAMPLE_TOTP_CODE = '123456';
export const SAMPLE_BACKUP_CODE = 'SAMPLE-BACKUP-0001';

export const personas: Persona[] = [
  {
    personaId: 'member',
    label: 'Member',
    userId: 'u-marija',
    name: 'Marija Stojanovska',
    initials: 'MS',
    username: 'marija-stojanovska',
    email: 'marija.s@students.feit.ukim.edu.mk',
    headline: 'Events team · member since 2023',
    memberStatus: 'active',
    adminRole: null,
    managedEventIds: [],
  },
  {
    personaId: 'pending',
    label: 'Pending member',
    userId: 'u-elena',
    name: 'Elena Petrovska',
    initials: 'EP',
    username: 'elena-petrovska',
    email: 'elena.p@students.finki.ukim.mk',
    headline: 'FINKI · 1st year',
    memberStatus: 'pending',
    adminRole: null,
    managedEventIds: [],
  },
  {
    personaId: 'event-manager',
    label: 'Event manager',
    userId: 'u-daniel',
    name: 'Daniel Ristov',
    initials: 'DR',
    username: 'daniel-ristov',
    email: 'daniel.r@eestec.mk',
    headline: 'Events team · member since 2022',
    memberStatus: 'active',
    adminRole: 'event_manager',
    managedEventIds: ['ev-ai-at-the-edge', 'ev-new-year-social-2026'],
  },
  {
    personaId: 'editor',
    label: 'Editor',
    userId: 'u-stefan',
    name: 'Stefan Nikolovski',
    initials: 'SN',
    username: 'stefan-nikolovski',
    email: 'pr@eestec.mk',
    headline: 'PR & media · Board 2026/2027',
    memberStatus: 'active',
    adminRole: 'editor',
    managedEventIds: [],
  },
  {
    personaId: 'super-admin',
    label: 'Super admin',
    userId: 'u-ana',
    name: 'Ana Trajkovska',
    initials: 'AT',
    username: 'ana-trajkovska',
    email: 'ana.t@eestec.mk',
    headline: 'Chairperson · Board 2026/2027',
    memberStatus: 'active',
    adminRole: 'super_admin',
    managedEventIds: [],
  },
];
