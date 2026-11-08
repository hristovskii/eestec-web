import type { Idea } from '../../types';

// SAMPLE DATA, from handoff/design-source/AdminIdeas.dc.html: the eight ideas of the canvas's list
// plus two more so the "Under review" and "Accepted" views have more than one row (docs/sample-data.md).
// Dates are relative to the canvas moment (2026-10-04, 18:18 Europe/Skopje). Names are made up; the
// addresses are `example.org`. Replaced by the real ideas from /submit.

type Sample = Pick<Idea, 'id' | 'typeId' | 'title' | 'description' | 'createdAt'> & Partial<Idea>;

const base = {
  attachment: null,
  name: null,
  email: null,
  consentAt: null,
  userId: null,
  isAnonymous: false,
  ownerId: null,
  ownerName: null,
  eventDraftId: null,
  status: 'new',
  locale: 'en',
} as const satisfies Partial<Idea>;

const idea = (sample: Sample): Idea => ({ ...base, ...sample });
const named = (name: string, email: string, at: string) => ({
  name,
  email,
  consentAt: at,
});
const anonymous = { isAnonymous: true } as const;

export const ideasFixture: Idea[] = [
  idea({
    id: 'idea-pcb',
    typeId: 'itype-workshop',
    title: 'A beginner workshop on PCB design',
    description:
      'Many first-years want to build hardware but have never designed a board. A two-evening workshop with KiCad, ending with a real PCB we order together, would be perfect before the EESTech Challenge.',
    attachment: {
      id: 'sample-pcb-plan',
      name: 'pcb-workshop-plan.pdf',
      size: 225_000,
      mime: 'application/pdf',
    },
    status: 'under_review',
    ownerId: 'u-ana',
    ownerName: 'Ana Trajkovska',
    ...named('Bojan Ilievski', 'bojan.i@example.org', '2026-10-04T11:20:00+02:00'),
    createdAt: '2026-10-04T11:20:00+02:00',
  }),
  idea({
    id: 'idea-hackathon',
    typeId: 'itype-event',
    title: 'Hackathon with the Faculty of Design',
    description:
      'A weekend where electronics students build a prototype together with design students: one team, one product, a demo on Sunday. The faculties are a ten-minute walk apart.',
    status: 'new',
    ...anonymous,
    createdAt: '2026-10-04T09:02:00+02:00',
  }),
  idea({
    id: 'idea-darkmode',
    typeId: 'itype-website',
    title: 'Dark mode for eestec.mk',
    description:
      'I read the events page late in the evening, and the white background is hard on the eyes. A dark theme that follows the phone setting would be great.',
    ...named('Filip Angelovski', 'filip.a@example.org', '2026-10-03T21:40:00+02:00'),
    userId: 'u-filip',
    createdAt: '2026-10-03T21:40:00+02:00',
  }),
  idea({
    id: 'idea-gridnova',
    typeId: 'itype-partner',
    title: 'Invite Gridnova for a lab tour',
    description:
      'Gridnova builds smart-meter hardware in Skopje. A visit to their lab would fit the Power & energy topic and could lead to a partnership for internships.',
    status: 'new',
    ...anonymous,
    createdAt: '2026-10-03T14:05:00+02:00',
  }),
  idea({
    id: 'idea-studygroup',
    typeId: 'itype-other',
    title: 'Study group before exam session',
    description:
      'Two weeks before the January session we could book a room on Wednesday evenings for a study group: mixed years, mixed subjects, someone brings snacks.',
    ...named('Sara Dimova', 'sara.d@example.org', '2026-10-02T16:30:00+02:00'),
    createdAt: '2026-10-02T16:30:00+02:00',
  }),
  idea({
    id: 'idea-softskills-mk',
    typeId: 'itype-workshop',
    title: 'Soft skills training in Macedonian',
    description:
      'Most soft-skills trainings are in English. A session in Macedonian about giving feedback and running meetings would reach students who are shy about English.',
    ...named('Ivana M.', 'ivana.m@example.org', '2026-10-01T12:10:00+02:00'),
    locale: 'mk',
    createdAt: '2026-10-01T12:10:00+02:00',
  }),
  idea({
    id: 'idea-robotics-hs',
    typeId: 'itype-event',
    title: 'Robotics workshop for high-schoolers',
    description:
      'Invite the final-year classes of two local high schools for a Saturday of line-follower robots built by our members. It could bring in next year’s first-years.',
    status: 'accepted',
    ownerId: 'u-ana',
    ownerName: 'Ana Trajkovska',
    eventDraftId: 'ev-robomac-2026',
    ...named('Nikola J.', 'nikola.j@example.org', '2026-09-20T10:00:00+02:00'),
    createdAt: '2026-09-20T10:00:00+02:00',
  }),
  idea({
    id: 'idea-photos-home',
    typeId: 'itype-website',
    title: 'More photos on the Home page',
    description:
      'The Home page could show a photo of the weekly meeting. It would make it less scary to come the first time.',
    status: 'archived',
    ...anonymous,
    createdAt: '2026-09-02T18:45:00+02:00',
  }),
  idea({
    id: 'idea-career-day',
    typeId: 'itype-partner',
    title: 'A career day with the companies from the Partners page',
    description:
      'Several partners have open internships. One afternoon with a stand for each company, and a short talk about what they look for in a first CV, would help everyone.',
    status: 'accepted',
    ownerId: 'u-ana',
    ownerName: 'Ana Trajkovska',
    ...named('A partner company', 'hr@example.org', '2026-08-28T09:15:00+02:00'),
    createdAt: '2026-08-28T09:15:00+02:00',
  }),
  idea({
    id: 'idea-board-games',
    typeId: 'itype-event',
    title: 'Board game night after the weekly meeting',
    description:
      'Once a month, stay after the Wednesday meeting for a board game night. A good way for new members to meet the older ones without a formal event.',
    status: 'under_review',
    ...named('Teodora Mitreva', 'teodora.m@example.org', '2026-09-15T19:00:00+02:00'),
    createdAt: '2026-09-15T19:00:00+02:00',
  }),
];
