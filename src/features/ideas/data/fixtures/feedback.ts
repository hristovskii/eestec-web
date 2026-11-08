import type { Feedback, SubmissionFile } from '../../types';

// SAMPLE DATA, from handoff/design-source/AdminIdeas.dc.html: the seven feedback rows of the canvas
// plus five more, so the ratings view has more than one rating per event (docs/sample-data.md). The
// ratings are computed from these rows, so the averages differ from the illustrative canvas ones.
// Dates are relative to the canvas moment (2026-10-04, 18:18). Names are made up.

type Sample = Pick<Feedback, 'id' | 'eventId' | 'eventTitle' | 'rating' | 'text' | 'createdAt'> &
  Partial<Feedback>;

const base = {
  otherEventName: '',
  photos: [] as SubmissionFile[],
  name: null,
  email: null,
  consentAt: null,
  userId: null,
  isAnonymous: false,
  memoryId: null,
  status: 'new',
  ownerId: null,
  ownerName: null,
  locale: 'en',
} as const satisfies Partial<Feedback>;

const feedback = (sample: Sample): Feedback => ({ ...base, ...sample });
const person = (name: string, at: string, userId: string | null = null) => ({
  name,
  email: userId ? null : `${name.split(' ')[0]?.toLowerCase() ?? 'guest'}@example.org`,
  consentAt: userId ? null : at,
  userId,
});

const POWER_UP = { eventId: 'ev-power-up-2026', eventTitle: 'Workshop: Power Up — Renewable Grids' } as const;
const SOFT = {
  eventId: 'ev-soft-skills-academy-2026',
  eventTitle: 'Soft Skills Academy Skopje 2026',
} as const;
const NYS = { eventId: 'ev-new-year-social-2025', eventTitle: 'New Year Social 2025' } as const;
const EESTECH = {
  eventId: 'ev-eestech-challenge-2026-skopje',
  eventTitle: 'EESTech Challenge 2026',
} as const;
const KRAKOW = {
  eventId: 'ev-krakow-winter-exchange',
  eventTitle: 'Exchange: Kraków Winter Edition',
} as const;

export const feedbackFixture: Feedback[] = [
  feedback({
    id: 'fb-marija-powerup',
    ...POWER_UP,
    rating: 4,
    text: 'The lab day was the best part: real equipment and engineers who took time for every question. Next time, a bit more free time in Ohrid and fewer hours on the bus would be great.',
    ...person('Marija Stojanovska', '2026-10-04T09:14:00+02:00', 'u-marija'),
    createdAt: '2026-10-04T09:14:00+02:00',
  }),
  feedback({
    id: 'fb-kasia-powerup',
    ...POWER_UP,
    rating: 5,
    text: 'Best workshop I attended this year. The speakers were generous with their time.',
    ...person('Kasia Nowak', '2026-10-03T20:10:00+02:00'),
    createdAt: '2026-10-03T20:10:00+02:00',
  }),
  feedback({
    id: 'fb-anon-soft',
    ...SOFT,
    rating: 3,
    text: 'Good trainers, but the room was too hot in the afternoon and we ran out of water.',
    isAnonymous: true,
    createdAt: '2026-10-03T11:30:00+02:00',
  }),
  feedback({
    id: 'fb-teodora-soft',
    ...SOFT,
    rating: 5,
    text: 'The feedback exercise changed how I run our team meetings. Thank you!',
    ...person('Teodora Mitreva', '2026-10-02T17:05:00+02:00', 'u-teodora'),
    createdAt: '2026-10-02T17:05:00+02:00',
  }),
  feedback({
    id: 'fb-guest-nys',
    ...NYS,
    rating: 2,
    text: 'Too crowded around the bar, and the music was too loud to talk.',
    status: 'under_review',
    ownerId: 'u-ana',
    ownerName: 'Ana Trajkovska',
    ...person('A guest', '2026-01-06T10:00:00+01:00'),
    createdAt: '2026-01-06T10:00:00+01:00',
  }),
  feedback({
    id: 'fb-filip-eestech',
    ...EESTECH,
    rating: 5,
    text: 'Well organized. The task was hard in a good way.',
    status: 'accepted',
    ...person('Filip Angelovski', '2026-03-24T12:00:00+01:00', 'u-filip'),
    createdAt: '2026-03-24T12:00:00+01:00',
  }),
  feedback({
    id: 'fb-guest-makstil',
    eventId: null,
    otherEventName: 'Study visit to Makstil',
    eventTitle: 'Study visit to Makstil',
    rating: null,
    text: 'Please organise another study visit; the guide was great and I learned a lot about steel.',
    status: 'archived',
    ...person('A guest', '2026-03-02T15:20:00+01:00'),
    createdAt: '2026-03-02T15:20:00+01:00',
  }),
  feedback({
    id: 'fb-sara-powerup',
    ...POWER_UP,
    rating: 5,
    text: 'Great week. The lab visit made the theory real for me.',
    status: 'archived',
    ...person('Sara Dimova', '2026-06-02T10:00:00+02:00', 'u-sara'),
    createdAt: '2026-06-02T10:00:00+02:00',
  }),
  feedback({
    id: 'fb-anon-powerup',
    ...POWER_UP,
    rating: 4,
    text: 'The topics were great; the schedule was a bit packed.',
    isAnonymous: true,
    status: 'archived',
    createdAt: '2026-06-01T20:00:00+02:00',
  }),
  feedback({
    id: 'fb-anon-krakow',
    ...KRAKOW,
    rating: 5,
    text: 'Best week of my studies so far.',
    isAnonymous: true,
    status: 'archived',
    createdAt: '2026-01-04T10:00:00+01:00',
  }),
  feedback({
    id: 'fb-ivana-nys',
    ...NYS,
    rating: 4,
    text: 'Fun night. I would come again if there were more seating.',
    status: 'archived',
    ...person('Ivana M.', '2026-01-05T09:00:00+01:00', 'u-ivana'),
    createdAt: '2026-01-05T09:00:00+01:00',
  }),
  feedback({
    id: 'fb-bojan-eestech',
    ...EESTECH,
    rating: 4,
    text: 'The final presentations ran late, but the atmosphere was great.',
    status: 'archived',
    ...person('Bojan Ilievski', '2026-03-25T10:00:00+01:00'),
    createdAt: '2026-03-25T10:00:00+01:00',
  }),
];
