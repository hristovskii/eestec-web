// SAMPLE DATA — the events of handoff/design-source/AdminEvents.dc.html (titles and dates).
// M5 adds the full event records (types, scope, status, gallery…) to this fixture.
import type { EventOption } from '../../types';

export const eventsFixture: EventOption[] = [
  { id: 'ev-ai-at-the-edge', title: 'Workshop: AI at the Edge', startsAt: '2026-11-07' },
  { id: 'ev-leading-teams', title: 'Soft Skills Training: Leading Teams', startsAt: '2026-11-14' },
  { id: 'ev-fpga-basics', title: 'Hands-on: FPGA Basics', startsAt: '2026-11-21' },
  { id: 'ev-new-year-social-2026', title: 'New Year Social 2026', startsAt: '2026-12-18' },
  {
    id: 'ev-eestech-challenge-2027',
    title: 'EESTech Challenge 2027 — Local Round Skopje',
    startsAt: '2027-03-13',
  },
  { id: 'ev-krakow-winter-exchange', title: 'Exchange: Kraków Winter Edition', startsAt: '2026-12-04' },
  { id: 'ev-soft-skills-academy-2026', title: 'Soft Skills Academy Skopje 2026', startsAt: '2026-09-12' },
  { id: 'ev-feeit-career-day-2026', title: 'FEEIT Career Day 2026', startsAt: '2026-05-20' },
  { id: 'ev-power-up-2026', title: 'Workshop: Power Up — Renewable Grids', startsAt: '2026-05-18' },
  { id: 'ev-robomac-2026', title: 'RoboMac 2026', startsAt: '2026-04-11' },
];
