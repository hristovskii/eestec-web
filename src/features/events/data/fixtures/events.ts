// SAMPLE DATA — the events of the canvas, normalized into one consistent dataset
// (docs/ARCHITECTURE.md §4.2). Sources: AdminEvents (rows, statuses, last edited), AdminEventEdit
// (AI at the Edge: every field), UpcomingList / UpcomingDetail / UpcomingStates / ApplyBox (upcoming
// events, programme, requirements, fee, deadlines), EventDetail (Power Up, the lecture evening),
// EventsList (archive cards), AdminDashboard (applications, places, deadlines).
//
// Canvas contradictions, resolved by picking one canvas value:
// - AI at the Edge is Published (AdminEvents, AdminDashboard), not Draft (AdminEventEdit).
// - New Year Social 2026 and EESTech Challenge 2027 are Drafts (AdminEvents), so the public
//   upcoming list shows five events, not seven. FEEIT Career Day 2026 is Hidden (AdminEvents).
// - Motivational Weekend Balkan Region is the upcoming 2026 edition (UpcomingList), not the
//   July one in Niš (EventDetail).
// - Power Up uses the AdminEvents title "Workshop: Power Up — Renewable Grids".
// - "Last edited by Marija Stojanovska" rows show Stefan Nikolovski: Marija is the member-only
//   sample persona (see auth fixtures, M4c).
// - Times the canvas doesn't give: one-day events are all-day; last-edited dates of rows not on
//   AdminEvents are their end date.
// Sample Macedonian fields reuse the English copy until the board supplies Macedonian (D14).
import type { Localized } from '@/shared/types/localized';

import type { EventEditor, EventRecord, EventTopic, EventType } from '../../types';

const both = (text: string): Localized => ({ mk: text, en: text });
const none: Localized = { mk: '' };

export const eventTypesFixture: EventType[] = [
  { id: 'type-workshop', name: both('Workshop') },
  { id: 'type-exchange', name: both('Exchange') },
  { id: 'type-motivational-weekend', name: both('Motivational Weekend') },
  { id: 'type-training', name: both('Training / Soft Skills') },
  { id: 'type-competition', name: both('Competition') },
  { id: 'type-conference', name: both('Conference / Statutory') },
  { id: 'type-social', name: both('Social') },
  { id: 'type-other', name: both('Other') },
];

export const eventTopicsFixture: EventTopic[] = [
  { id: 'topic-hardware', name: both('Hardware') },
  { id: 'topic-ai-data', name: both('AI & data') },
  { id: 'topic-software', name: both('Software') },
  { id: 'topic-power-energy', name: both('Power & energy') },
  { id: 'topic-telecom', name: both('Telecom') },
  { id: 'topic-soft-skills', name: both('Soft skills') },
  { id: 'topic-career', name: both('Career') },
];

const ana: EventEditor = { userId: 'u-ana', name: 'Ana Trajkovska' };
const daniel: EventEditor = { userId: 'u-daniel', name: 'Daniel Ristov' };
const stefan: EventEditor = { userId: 'u-stefan', name: 'Stefan Nikolovski' };

type Sample = Partial<EventRecord> &
  Pick<EventRecord, 'slug' | 'title' | 'scope' | 'typeId' | 'startsAt' | 'endsAt' | 'location'>;

/** One-day event without times (the canvas gives only the date). */
const allDay = (day: string, until = day) => ({
  startsAt: `${day}T00:00:00${offset(day)}`,
  endsAt: `${until}T23:59:00${offset(until)}`,
  allDay: true,
});
/** Skopje is UTC+2 from the last Sunday of March to the last Sunday of October (good enough for samples). */
function offset(day: string) {
  const month = Number(day.slice(5, 7));
  const date = Number(day.slice(8, 10));
  const summer = (month > 3 && month < 10) || (month === 3 && date >= 29) || (month === 10 && date < 25);
  return summer ? '+02:00' : '+01:00';
}

const event = (sample: Sample): EventRecord => ({
  id: `ev-${sample.slug}`,
  shortDescription: none,
  topicIds: [],
  allDay: false,
  city: none,
  country: none,
  organizer: null,
  description: none,
  agenda: [],
  requirements: none,
  fee: { price: none, note: none },
  contactEmail: '',
  participantCount: null,
  countryCount: null,
  cover: null,
  gallery: [],
  infoPackId: null,
  videoUrl: '',
  status: 'published',
  publishAt: null,
  nextUp: false,
  seo: { title: none, description: none, shareImageId: null },
  createdAt: sample.updatedAt ?? sample.endsAt,
  updatedAt: sample.endsAt,
  updatedBy: stefan,
  ...sample,
  applications: {
    enabled: false,
    via: 'form',
    externalUrl: '',
    opensAt: null,
    deadline: null,
    resultsOn: null,
    maxParticipants: 24,
    waitlist: true,
    ...sample.applications,
  },
});

const cover = (mediaId: string, alt: string): EventRecord['cover'] => ({ mediaId, alt });

const AI_DESCRIPTION =
  '<h3>About the workshop</h3>' +
  '<p>Most AI runs in big data centres. This workshop is about the opposite: <strong>small models that run on a €10 board</strong>, with no internet connection. You will train a model, squeeze it onto a microcontroller and build a working prototype with your team.</p>' +
  '<ul><li><p>Lectures by FEEIT professors and engineers from local companies</p></li><li><p>A full lab day and a company visit</p></li><li><p>A team challenge and a day trip to Ohrid</p></li></ul>' +
  '<p>No prior machine-learning experience is needed. Read the <a href="https://eestec.mk/upcoming/ai-at-the-edge">full programme</a>.</p>';

const AI_AGENDA: [string, string, string][] = [
  [
    '2026-11-07',
    'Arrival and welcome party',
    'Pick-up from Skopje airport, check-in and a first night in the Old Bazaar.',
  ],
  [
    '2026-11-08',
    'Edge AI fundamentals',
    'Lectures at FEEIT: what changes when a model has to fit into 256 KB.',
  ],
  [
    '2026-11-09',
    'Lab: models on microcontrollers',
    'Train a keyword-spotting model and deploy it to a dev board.',
  ],
  ['2026-11-10', 'Company visit', 'See how a local hardware company ships embedded ML in its products.'],
  ['2026-11-11', 'Team challenge', 'Build a prototype in teams of four and present it to a jury.'],
  ['2026-11-12', 'Ohrid day trip', 'Old town, the lake and the international night.'],
  ['2026-11-13', 'Departure', 'Breakfast, goodbyes and transfers to the airport.'],
];

const AI_REQUIREMENTS =
  '<ul>' +
  [
    'Bachelor’s or master’s student in electrical engineering, computer science or a related field',
    'Comfortable with basic programming (Python or C)',
    'Able to communicate in English',
    'EESTEC members get priority; non-members are welcome to apply',
  ]
    .map((item) => `<li><p>${item}</p></li>`)
    .join('') +
  '</ul>';

const POWER_UP_DESCRIPTION =
  '<h3>About the workshop</h3>' +
  '<p>Power Up brought 24 students from 14 countries to Skopje for a week of lectures, lab work and field visits. Professors from FEEIT explained how a national grid balances supply and demand, and engineers from local energy companies showed what that looks like in practice.</p>' +
  '<h3>What we did</h3>' +
  '<ul><li><p>A full lab day in the FEEIT high-voltage laboratory</p></li><li><p>A visit to a 10 MW solar plant outside Skopje</p></li><li><p>A team challenge: keep a simulated grid stable through a cloudy afternoon</p></li><li><p>An international night and a weekend in Ohrid</p></li></ul>' +
  '<p>The workshop was organized by a team of 16 LC Skopje members. Most of them were organizing an international event for the first time.</p>';

const LECTURE_DESCRIPTION =
  '<h3>About the lecture</h3>' +
  '<p>Every second, the power grid has to produce exactly as much electricity as the country uses. In this evening lecture, an engineer from the national transmission operator explained how that balance is kept, what happens when a power plant suddenly trips, and why more solar power makes the job harder.</p>' +
  '<p>The lecture was open to all FEEIT students and was followed by questions and a short tour of the faculty&#39;s power systems lab.</p>';

export const eventsFixture: EventRecord[] = [
  // ─── Upcoming ───
  event({
    slug: 'ai-at-the-edge',
    title: both('Workshop: AI at the Edge'),
    shortDescription: both(
      'A week of building and deploying machine-learning models on microcontrollers, in Skopje and Ohrid, for 24 students from across Europe.',
    ),
    scope: 'international',
    typeId: 'type-workshop',
    topicIds: ['topic-hardware', 'topic-ai-data'],
    startsAt: '2026-11-07T10:00:00+01:00',
    endsAt: '2026-11-13T14:00:00+01:00',
    location: both('Skopje & Ohrid, North Macedonia'),
    city: both('Skopje & Ohrid'),
    country: both('North Macedonia'),
    description: both(AI_DESCRIPTION),
    agenda: AI_AGENDA.map(([date, title, text], index) => ({
      id: `agenda-ai-${index + 1}`,
      date,
      title: both(title),
      text: both(text),
    })),
    requirements: both(AI_REQUIREMENTS),
    fee: {
      price: both('€60'),
      note: both(
        'Covers accommodation, all meals, local transport and the Ohrid trip. Travel to Skopje is not included.',
      ),
    },
    contactEmail: 'aiedge@eestec.mk',
    cover: cover(
      'media-ai-edge-cover',
      'Two students at a lab bench at FEEIT, connecting a camera module to a small development board.',
    ),
    gallery: [
      'Opening session in the FEEIT amphitheatre',
      'Students wiring a sensor to a dev board',
      null,
      'Team presenting their prototype',
      'Lab bench with oscilloscopes',
      'Group photo at Lake Ohrid',
      'International night buffet',
      'Closing ceremony certificates',
    ].map((alt, index) => ({ mediaId: `media-ai-edge-gallery-${index + 1}`, alt })),
    infoPackId: 'media-doc-ai-edge-pack',
    nextUp: true,
    applications: {
      enabled: true,
      via: 'form',
      externalUrl: '',
      opensAt: '2026-10-01T00:00:00+02:00',
      deadline: '2026-10-18T23:59:00+02:00',
      resultsOn: '2026-10-25',
      maxParticipants: 24,
      waitlist: true,
    },
    createdAt: '2026-09-14T12:00:00+02:00',
    updatedAt: '2026-10-04T16:02:00+02:00',
    updatedBy: ana,
  }),
  event({
    slug: 'leading-teams',
    title: both('Soft Skills Training: Leading Teams'),
    scope: 'local',
    typeId: 'type-training',
    topicIds: ['topic-soft-skills'],
    ...allDay('2026-11-14'),
    location: both('FEEIT, Skopje'),
    cover: cover('media-leading-teams', 'A trainer writing on a flipchart in front of a group'),
    fee: { price: both('Free for FEEIT students'), note: none },
    applications: {
      enabled: true,
      via: 'form',
      externalUrl: '',
      opensAt: null,
      deadline: '2026-10-06T23:59:00+02:00',
      resultsOn: null,
      maxParticipants: 30,
      waitlist: true,
    },
    updatedAt: '2026-10-03T19:20:00+02:00',
    updatedBy: daniel,
  }),
  event({
    slug: 'fpga-basics',
    title: both('Hands-on: FPGA Basics'),
    scope: 'local',
    typeId: 'type-workshop',
    topicIds: ['topic-hardware'],
    ...allDay('2026-11-21', '2026-11-22'),
    location: both('Lab 215, FEEIT'),
    applications: {
      enabled: true,
      via: 'form',
      externalUrl: '',
      opensAt: null,
      deadline: '2026-11-15T23:59:00+01:00',
      resultsOn: null,
      maxParticipants: 20,
      waitlist: true,
    },
    updatedAt: '2026-10-02T14:10:00+02:00',
    updatedBy: daniel,
  }),
  event({
    slug: 'krakow-winter-exchange',
    title: both('Exchange: Kraków Winter Edition'),
    scope: 'international',
    typeId: 'type-exchange',
    ...allDay('2026-12-04', '2026-12-08'),
    location: both('Kraków, Poland'),
    city: both('Kraków'),
    country: both('Poland'),
    organizer: 'LC Kraków',
    cover: cover('media-krakow-winter', 'Kraków old town in winter'),
    applications: {
      enabled: true,
      via: 'external',
      externalUrl: 'https://eestec.net',
      opensAt: '2026-10-15T12:00:00+02:00',
      deadline: '2026-10-23T23:59:00+02:00',
      resultsOn: null,
      maxParticipants: null,
      waitlist: false,
    },
    updatedAt: '2026-09-28T11:00:00+02:00',
    updatedBy: ana,
  }),
  event({
    slug: 'mw-balkan-2026',
    title: both('Motivational Weekend Balkan Region 2026'),
    scope: 'international',
    typeId: 'type-motivational-weekend',
    ...allDay('2026-11-13', '2026-11-15'),
    location: both('Belgrade, Serbia'),
    city: both('Belgrade'),
    country: both('Serbia'),
    organizer: '',
    cover: cover('media-mw-balkan', 'Motivational Weekend participants standing in a circle'),
    applications: {
      enabled: true,
      via: 'form',
      externalUrl: '',
      opensAt: null,
      deadline: '2026-10-01T23:59:00+02:00',
      resultsOn: '2026-10-08',
      maxParticipants: 24,
      waitlist: true,
    },
    updatedAt: '2026-09-15T10:00:00+02:00',
    updatedBy: ana,
  }),
  event({
    slug: 'new-year-social-2026',
    title: both('New Year Social 2026'),
    scope: 'local',
    typeId: 'type-social',
    ...allDay('2026-12-18'),
    location: both('Old Bazaar, Skopje'),
    cover: cover('media-new-year-toast', 'Members toasting at last year’s New Year party'),
    status: 'draft',
    applications: {
      enabled: true,
      via: 'form',
      externalUrl: '',
      opensAt: null,
      // UpcomingList: "Sign-ups close in 71 days" from the canvas moment.
      deadline: '2026-12-14T23:59:00+01:00',
      resultsOn: null,
      maxParticipants: 24,
      waitlist: true,
    },
    updatedAt: '2026-10-01T18:30:00+02:00',
    updatedBy: stefan,
  }),
  event({
    slug: 'eestech-challenge-2027',
    title: both('EESTech Challenge 2027 — Local Round Skopje'),
    scope: 'local',
    typeId: 'type-competition',
    ...allDay('2027-03-13'),
    location: both('FEEIT, Skopje'),
    status: 'draft',
    applications: {
      enabled: true,
      via: 'form',
      externalUrl: '',
      opensAt: '2027-02-01T00:00:00+01:00',
      deadline: null,
      resultsOn: null,
      maxParticipants: 24,
      waitlist: true,
    },
    updatedAt: '2026-09-30T15:45:00+02:00',
    updatedBy: stefan,
  }),

  // ─── Past ───
  event({
    slug: 'soft-skills-academy-2026',
    title: both('Soft Skills Academy Skopje 2026'),
    scope: 'local',
    typeId: 'type-training',
    topicIds: ['topic-soft-skills'],
    ...allDay('2026-09-12', '2026-09-14'),
    location: both('FEEIT, Skopje'),
    cover: cover('media-soft-skills', 'Participants standing in a circle during a group exercise'),
    updatedAt: '2026-09-20T11:00:00+02:00',
    updatedBy: stefan,
  }),
  event({
    slug: 'feeit-career-day-2026',
    title: both('FEEIT Career Day 2026'),
    scope: 'local',
    typeId: 'type-other',
    topicIds: ['topic-career'],
    ...allDay('2026-05-20'),
    location: both('FEEIT, Skopje'),
    organizer: '',
    cover: cover('media-career-day', 'Students talking to company representatives at their booths'),
    status: 'hidden',
    updatedAt: '2026-06-03T09:15:00+02:00',
    updatedBy: ana,
  }),
  event({
    slug: 'power-up-2026',
    title: both('Workshop: Power Up — Renewable Grids'),
    shortDescription: both(
      'Seven days in Skopje and Ohrid about how power grids change when most of the energy comes from the sun and the wind.',
    ),
    scope: 'international',
    typeId: 'type-workshop',
    topicIds: ['topic-power-energy'],
    ...allDay('2026-05-18', '2026-05-24'),
    location: both('Skopje & Ohrid, North Macedonia'),
    city: both('Skopje & Ohrid'),
    country: both('North Macedonia'),
    description: both(POWER_UP_DESCRIPTION),
    participantCount: 24,
    countryCount: 14,
    cover: cover('media-power-up-group', 'All 24 participants in front of FEEIT on day one'),
    gallery: [
      { mediaId: 'media-power-up-gallery-1', alt: 'Opening session at FEEIT' },
      { mediaId: 'media-power-up-gallery-2', alt: 'High-voltage lab day' },
      { mediaId: 'media-power-up', alt: 'Students in hard hats walking between rows of solar panels' },
      { mediaId: 'media-power-up-gallery-3', alt: 'Grid simulation challenge' },
      { mediaId: 'media-power-up-gallery-4', alt: 'Team presentations', credit: 'Ana Trajkovska' },
      { mediaId: 'media-power-up-gallery-5', alt: 'International night' },
      { mediaId: 'media-power-up-gallery-6', alt: 'Ohrid old town walk' },
    ],
    updatedAt: '2026-06-01T10:30:00+02:00',
    updatedBy: ana,
  }),
  event({
    slug: 'delft-by-bike',
    title: both('Exchange: Delft by Bike'),
    scope: 'international',
    typeId: 'type-exchange',
    ...allDay('2026-04-14', '2026-04-18'),
    location: both('Delft, Netherlands'),
    city: both('Delft'),
    country: both('Netherlands'),
    organizer: '',
  }),
  event({
    slug: 'robomac-2026',
    title: both('RoboMac 2026'),
    scope: 'local',
    typeId: 'type-competition',
    topicIds: ['topic-hardware'],
    ...allDay('2026-04-11'),
    location: both('FEEIT, Skopje'),
    updatedAt: '2026-04-15T17:40:00+02:00',
    updatedBy: stefan,
  }),
  event({
    slug: 'eestech-challenge-2026-skopje',
    title: both('EESTech Challenge 2026 — Local Round Skopje'),
    scope: 'local',
    typeId: 'type-competition',
    ...allDay('2026-03-14'),
    location: both('FEEIT, Skopje'),
    cover: cover('media-eestech-jury', 'A student team presenting their project to three jury members'),
  }),
  event({
    slug: 'pcb-design-kicad',
    title: both('Hands-on: PCB Design in KiCad'),
    scope: 'local',
    typeId: 'type-workshop',
    topicIds: ['topic-hardware'],
    ...allDay('2026-02-26', '2026-02-27'),
    location: both('Lab 215, FEEIT'),
    cover: cover('media-pcb-closeup', 'Close-up of a finished printed circuit board'),
  }),
  event({
    slug: 'new-year-social-2025',
    title: both('New Year Social 2025'),
    scope: 'local',
    typeId: 'type-social',
    ...allDay('2025-12-19'),
    location: both('Old Bazaar, Skopje'),
    cover: cover('media-new-year-2025', 'Members at the New Year party'),
  }),
  event({
    slug: 'embedded-rust-2025',
    title: both('Intro to Embedded Rust'),
    scope: 'local',
    typeId: 'type-workshop',
    topicIds: ['topic-software', 'topic-hardware'],
    ...allDay('2025-11-22', '2025-11-23'),
    location: both('Lab 215, FEEIT'),
  }),
  event({
    slug: 'recruitment-day-2025',
    title: both('Recruitment Day: Meet EESTEC'),
    scope: 'local',
    typeId: 'type-other',
    ...allDay('2025-10-15'),
    location: both('FEEIT main hall'),
    cover: cover('media-recruitment-stand', 'The EESTEC info stand in the FEEIT hall'),
  }),
  event({
    slug: 'soft-skills-academy-2025',
    title: both('Soft Skills Academy Skopje 2025'),
    scope: 'local',
    typeId: 'type-training',
    topicIds: ['topic-soft-skills'],
    ...allDay('2025-09-19', '2025-09-21'),
    location: both('FEEIT, Skopje'),
    cover: cover('media-ssa-2025', 'A trainer leading a session'),
  }),
  event({
    slug: 'robomac-2025',
    title: both('RoboMac 2025'),
    scope: 'local',
    typeId: 'type-competition',
    topicIds: ['topic-hardware'],
    ...allDay('2025-04-12'),
    location: both('FEEIT, Skopje'),
    cover: cover('media-robomac-2025', 'Line-follower robots on the track'),
  }),
  event({
    slug: 'eestech-challenge-2025',
    title: both('EESTech Challenge 2025 — Local Round Skopje'),
    scope: 'local',
    typeId: 'type-competition',
    ...allDay('2025-03-14'),
    location: both('FEEIT, Skopje'),
  }),
  event({
    slug: 'public-speaking-bootcamp',
    title: both('Public Speaking Bootcamp'),
    scope: 'local',
    typeId: 'type-training',
    topicIds: ['topic-soft-skills'],
    ...allDay('2025-01-25'),
    location: both('FEEIT, Skopje'),
    cover: cover('media-public-speaking', 'A student presenting on stage'),
  }),
  event({
    slug: 'power-grid-lecture',
    title: both('Lecture evening: How the Macedonian power grid keeps the lights on'),
    shortDescription: both(
      'An evening lecture for FEEIT students about how the national grid balances supply and demand every second.',
    ),
    scope: 'local',
    typeId: 'type-other',
    topicIds: ['topic-power-energy'],
    startsAt: '2024-12-09T18:00:00+01:00',
    endsAt: '2024-12-09T18:00:00+01:00',
    location: both('Amphitheatre 1, FEEIT, Skopje'),
    organizer: 'FEEIT Student Parliament, with LC Skopje',
    description: both(LECTURE_DESCRIPTION),
    cover: cover('media-lecture-hall', 'A lecture hall at FEEIT'),
  }),
  event({
    slug: 'arduino-beginners',
    title: both('Local workshop: Arduino for Beginners'),
    scope: 'local',
    typeId: 'type-workshop',
    topicIds: ['topic-hardware'],
    ...allDay('2024-11-23'),
    location: both('Lab 215, FEEIT'),
  }),
];

/** SAMPLE: applications per event (AdminEvents, AdminDashboard) until the applications feature (M7). */
export const sampleApplicationCounts: Record<string, { count: number; full: boolean }> = {
  'ev-ai-at-the-edge': { count: 38, full: false },
  'ev-leading-teams': { count: 23, full: false },
  'ev-fpga-basics': { count: 27, full: true },
  'ev-soft-skills-academy-2026': { count: 41, full: false },
  'ev-power-up-2026': { count: 64, full: false },
};

/** Old addresses (none on the canvas). */
export const slugRedirectsFixture: Record<string, string> = {};
