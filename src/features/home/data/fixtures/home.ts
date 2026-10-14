import type { Localized } from '@/shared/types/localized';

import { DEFAULT_LAYOUT } from '../../domain/layout';
import type { HomeRecord } from '../../types';

// SAMPLE DATA, transcribed from handoff/design-source/Home-Desktop.dc.html (docs/sample-data.md).
// The board replaces it in Admin › Pages › Home. The canvas is English only, so Macedonian reuses
// the English text until the board supplies it (D14). The three timeline photos are the canvas's
// "Photo: …" placeholders (media fixtures).

const both = (text: string): Localized => ({ mk: text, en: text });

export const homeFixture: HomeRecord = {
  hero: {
    eyebrow: both('EESTEC LC Skopje · FEEIT, Ss. Cyril and Methodius University'),
    headline: both('Learn more. Travel further. Build it together.'),
    subtitle: both(
      'Connecting electrical engineering and computer science students across Europe through workshops, exchanges and trainings.',
    ),
    primary: { label: both('Join Us'), href: '/join' },
    secondary: { label: both('Upcoming Events'), href: '/upcoming' },
    image: null,
  },
  about: {
    body: both(
      "EESTEC, the Electrical Engineering STudents' European assoCiation, is a non-profit, non-political student association founded in 1986 in the Netherlands.\n\nToday it is a network of Local Committees at technical universities across Europe. Together they organize workshops, exchanges and trainings that help students grow professionally and personally — and make friends in every corner of the continent.",
    ),
  },
  activities: [
    {
      id: 'act-workshops',
      icon: 'cpu',
      title: both('Workshops'),
      text: both(
        'A week of lectures, labs and city life on a technical topic, hosted by one committee for students from all over Europe.',
      ),
    },
    {
      id: 'act-exchanges',
      icon: 'exchange',
      title: both('Exchanges'),
      text: both(
        "Short, culture-first trips to another committee's city. The easiest way to go international for the first time.",
      ),
    },
    {
      id: 'act-weekends',
      icon: 'zap',
      title: both('Motivational Weekends'),
      text: both('Weekend trainings that turn new members into confident organizers and team players.'),
    },
    {
      id: 'act-soft-skills',
      icon: 'message',
      title: both('Soft Skills trainings'),
      text: both("Communication, leadership and teamwork sessions led by EESTEC's own certified trainers."),
    },
    {
      id: 'act-competitions',
      icon: 'trophy',
      title: both('Competitions'),
      text: both(
        'Team challenges like the EESTech Challenge and RoboMac: local rounds first, international finals next.',
      ),
    },
    {
      id: 'act-congress',
      icon: 'users',
      title: both('Congress'),
      text: both(
        'The yearly gathering where delegates from every committee shape the future of the association.',
      ),
    },
  ],
  milestones: [
    {
      id: 'ms-2005',
      year: 2005,
      title: both('International networking workshop'),
      text: both(
        'A week of networking in Skopje for students from across Europe, closing with a weekend in Ohrid.',
      ),
      photo: {
        mediaId: 'media-home-workshop-2005',
        alt: both('Workshop participants on the shore of Lake Ohrid'),
      },
    },
    {
      id: 'ms-2011',
      year: 2011,
      title: both('Hosting the EESTEC Chairpersons’ Meeting'),
      text: both('LC Skopje welcomed the chairpersons of committees from all over Europe for the ECM.'),
      photo: null,
    },
    {
      id: 'ms-2015',
      year: 2015,
      title: both('RoboMac is born'),
      text: both('A robotics competition co-organized with IEEE SB Skopje and the FEEIT Student Parliament.'),
      photo: { mediaId: 'media-home-robomac', alt: both('Small robots on the RoboMac arena') },
    },
    {
      id: 'ms-2019',
      year: 2019,
      title: both('Soft Skills Academy'),
      text: both('Our first local training academy, run by EESTEC trainers for FEEIT students.'),
      photo: null,
    },
    {
      id: 'ms-2025',
      year: 2025,
      title: both('20 years of international events'),
      text: both('Two decades of workshops and exchanges hosted in Skopje and Ohrid.'),
      photo: { mediaId: 'media-home-anniversary', alt: both('Anniversary group photo in front of FEEIT') },
    },
  ],
  stats: [
    { id: 'st-committees', label: both('Local Committees'), value: 35, suffix: '' },
    { id: 'st-countries', label: both('Countries'), value: 21, suffix: '' },
    { id: 'st-members', label: both('EESTEC members in Europe'), value: 5000, suffix: '+' },
    { id: 'st-skopje-members', label: both('LC Skopje members'), value: 80, suffix: '' },
    { id: 'st-events', label: both('Events by LC Skopje'), value: 150, suffix: '+' },
  ],
  layout: DEFAULT_LAYOUT.map((item) => ({ ...item })),
};
