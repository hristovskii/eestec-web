// SAMPLE DATA — the people of MembersPage, MemberCardStates and MemberProfile (handoff/design-source).
//
// - The 15 listed members, minus Elena Petrovska (she is the pending sample account, see
//   `auth/data/fixtures/members.ts`), plus the three the visitor view adds (Biljana Ristovska,
//   Damjan Velkov, Emilija Trajkovska) and the five board members (Ana, Ivana, Marko, Elena
//   Dimitrova, Stefan). The canvas counts (37 / 48 members, 64 alumni) are hard-coded and do not match
//   its own lists, so the page counts what is here.
// - Only years are drawn ("since 2023"): the day and month of every start date is made up (1 October,
//   the start of the semester), except Marija's "October 2023" which the profile draws.
// - Five of them are accounts of the sample personas (Marija, Daniel, Stefan, Ana, Ivana): same
//   `userId` and `username` as in `auth/data/fixtures/personas.ts`. Daniel joined in 2024 in the list,
//   his persona headline says 2022; the list wins here.
// - The canvas draws a photo placeholder for everyone except those marked "no photo"; there are no
//   sample photos (`src: null`).
// - Marija's profile lists four of the canvas's five events: "Exchange: Kraków Winter Edition" (2 Dec
//   2024) is not in the sample events (the sample Kraków exchange is the upcoming one of December
//   2026), so it is not linked. Her badge note still mentions it.
// - Phone and e-mail are never part of a profile.
import type { Profile, ProfileEvent, ProfileTeam } from '../../types';

const lead = (teamId: string): ProfileTeam => ({ teamId, role: 'lead' });
const member = (teamId: string): ProfileTeam => ({ teamId, role: 'member' });
const trainer = (teamId: string): ProfileTeam => ({ teamId, role: 'trainer' });

const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z ]/g, '')
    .trim()
    .replace(/ +/g, '-');

type Seed = {
  name: string;
  since: number;
  teams?: ProfileTeam[];
  visibility?: Profile['visibility'];
  photo?: boolean;
  userId?: string;
  username?: string;
  bio?: string;
  links?: Pick<Profile, 'linkedinUrl' | 'githubUrl'>;
  since_date?: string;
  events?: ProfileEvent[];
  badges?: Profile['badges'];
  faculty?: string;
};

const person = (seed: Seed): Profile => ({
  userId: seed.userId ?? `p-${slug(seed.name)}`,
  username: seed.username ?? slug(seed.name),
  name: seed.name,
  photo: seed.photo === false ? null : { src: null },
  hidePhoto: false,
  bio: seed.bio ?? '',
  hideBio: false,
  linkedinUrl: seed.links?.linkedinUrl ?? '',
  githubUrl: seed.links?.githubUrl ?? '',
  visibility: seed.visibility ?? 'public',
  status: 'active',
  memberSince: seed.since_date ?? `${seed.since}-10-01`,
  activeTo: null,
  alumniNow: null,
  alumniHighlight: null,
  faculty: seed.faculty ?? '',
  teams: seed.teams ?? [],
  badges: seed.badges ?? [],
  events: seed.events ?? [],
});

const alum = (name: string, from: number, to: number, now: string, highlight?: string): Profile => ({
  ...person({ name, since: from, photo: false }),
  status: 'alumni',
  activeTo: `${to}-06-30`,
  alumniNow: now ? { mk: now, en: now } : null,
  alumniHighlight: highlight ? { mk: highlight, en: highlight } : null,
});

export const MARIJA_BIO =
  'Third-year Computer Hardware student at FEEIT. I joined EESTEC for one workshop and stayed for the people. These days I lead the Events team, which means spreadsheets, room bookings, and making sure 28 people from 14 countries get on the same bus. Ask me about microcontrollers or the best burek near the faculty.';

export const profilesFixture: Profile[] = [
  person({ name: 'Aleksandar Popov', since: 2021, teams: [lead('t-hr')] }),
  person({
    name: 'Daniel Ristov',
    since: 2024,
    userId: 'u-daniel',
    username: 'daniel-ristov',
    teams: [member('t-events'), member('t-it')],
  }),
  person({ name: 'Filip Angelovski', since: 2022, teams: [lead('t-it')] }),
  person({ name: 'Goran Spasovski', since: 2023, teams: [member('t-fr')], visibility: 'members_only' }),
  person({ name: 'Ivana Mitrevska', since: 2026, teams: [member('t-it')], photo: false }),
  person({ name: 'Jana Kostovska', since: 2025, teams: [member('t-pr')] }),
  person({ name: 'Kristina Velkovska', since: 2024, teams: [member('t-pr'), member('t-design')] }),
  person({
    name: 'Marija Stojanovska',
    since: 2023,
    since_date: '2023-10-01',
    userId: 'u-marija',
    username: 'marija-stojanovska',
    // From MyProfile.dc.html (the faculty select shows FEEIT).
    faculty: 'FEEIT',
    teams: [lead('t-events')],
    visibility: 'members_only',
    bio: MARIJA_BIO,
    links: {
      linkedinUrl: 'https://linkedin.com/in/marija-stojanovska',
      githubUrl: 'https://github.com/marijas',
    },
    events: [
      { eventId: 'ev-ai-at-the-edge', role: 'organizer' },
      { eventId: 'ev-soft-skills-academy-2026', role: 'organizer' },
      { eventId: 'ev-power-up-2026', role: 'organizer' },
      { eventId: 'ev-eestech-challenge-2025', role: 'participant' },
    ],
    badges: [
      { badgeId: 'b-organizer', note: 'Helped organize 3 events', awardedAt: '2026-09-12' },
      { badgeId: 'b-first-international', note: 'Exchange: Kraków, Dec 2024', awardedAt: '2024-12-02' },
      { badgeId: 'b-team-lead', note: 'Events team since 2025', awardedAt: '2025-01-15' },
    ],
  }),
  person({ name: 'Martin Stojanov', since: 2025, teams: [member('t-fr')], photo: false }),
  person({ name: 'Nikola Jovanovski', since: 2022, teams: [trainer('t-it')] }),
  person({ name: 'Sara Dimova', since: 2023, teams: [member('t-hr')] }),
  person({ name: 'Tamara Nikolova', since: 2025, teams: [member('t-hr')], visibility: 'members_only' }),
  person({ name: 'Teodora Mitreva', since: 2022, teams: [lead('t-fr')] }),
  person({ name: 'Viktor Trajanov', since: 2025, teams: [member('t-events')], photo: false }),
  person({ name: 'Biljana Ristovska', since: 2024, teams: [member('t-events')] }),
  person({ name: 'Damjan Velkov', since: 2026, teams: [member('t-it')], photo: false }),
  person({ name: 'Emilija Trajkovska', since: 2025, teams: [member('t-pr')] }),

  // Board 2026/2027. Stefan is the "PR, team lead, since 2023" card of MemberCardStates.
  person({ name: 'Ana Trajkovska', since: 2022, userId: 'u-ana', username: 'ana-trajkovska' }),
  person({ name: 'Ivana Kostova', since: 2022, userId: 'u-ivana', username: 'ivana-kostova' }),
  person({ name: 'Marko Iliev', since: 2022 }),
  person({ name: 'Elena Dimitrova', since: 2022 }),
  person({
    name: 'Stefan Nikolovski',
    since: 2023,
    userId: 'u-stefan',
    username: 'stefan-nikolovski',
    teams: [lead('t-pr')],
  }),

  // Alumni (the canvas lists nine of its "64").
  alum('Bojan Petreski', 2018, 2023, 'Embedded engineer at Gridnova', 'Chair 2021/22'),
  alum('Aleksandra Ilievska', 2016, 2021, 'PhD student, TU Delft'),
  alum('Dimitar Kocev', 2017, 2022, 'Software engineer at Kodra'),
  alum('Simona Ristevska', 2015, 2019, 'Product manager in Skopje', 'Board 2018/19'),
  alum('Katerina Angelova', 2019, 2024, 'Hardware designer at Amperix'),
  alum('Petar Lazarov', 2013, 2017, 'CTO at Voltline', 'Founding member'),
  alum('Natasha Bogdanovska', 2018, 2022, 'Teaching assistant, FEEIT'),
  alum('Ljupcho Georgiev', 2014, 2018, ''),
  alum('Vlatko Mitev', 2016, 2020, 'Trainer, EESTEC Soft Skills'),
];
