import type { Localized } from '@/shared/types/localized';

import type { ContactPageRecord } from '../../types';

// SAMPLE DATA, transcribed from handoff/design-source/ContactPage.dc.html, ContactForm.dc.html and
// ContactStates.dc.html (docs/sample-data.md). The canvas is English only, so Macedonian reuses the
// English text until the board supplies it (D14). The routed e-mail addresses are the sample board
// addresses of Settings; **the board decides the real routing**. The pin is an approximate position
// of FEEIT: the board confirms the exact spot before launch.

const both = (text: string): Localized => ({ mk: text, en: text });
const none: Localized = { mk: '' };

export const contactFixture: ContactPageRecord = {
  hero: {
    title: both('Contact'),
    lead: both('Students, companies and other committees: write to us and the right person will answer.'),
  },
  shortcuts: [
    { id: 'shortcut-join', eyebrow: both('Want to join?'), label: both('Join Us'), href: '/join' },
    {
      id: 'shortcut-companies',
      eyebrow: both('A company?'),
      label: both('For Companies'),
      href: '/partners',
    },
  ],
  headings: {
    info: both('Contact info'),
    board: both('Write to a board member'),
    map: both('How to find us'),
    social: both('Follow us'),
    legal: both('Legal info'),
  },
  form: {
    title: both('Send us a message'),
    intro: both('We usually reply within 2 working days.'),
  },
  subjects: [
    {
      id: 'subject-general',
      name: both('General question'),
      routeEmail: 'hello@eestec.mk',
      teamLabel: both('board'),
      routeNote: none,
      shortcutLabel: none,
      shortcutUrl: '',
    },
    {
      id: 'subject-membership',
      name: both('Membership'),
      routeEmail: 'members@eestec.mk',
      teamLabel: both('membership team'),
      routeNote: both('Want to join? The quickest way is the membership form.'),
      shortcutLabel: both('Join Us →'),
      shortcutUrl: '/join#apply',
    },
    {
      id: 'subject-partnership',
      name: both('Partnership'),
      routeEmail: 'partners@eestec.mk',
      teamLabel: both('fundraising team'),
      routeNote: both(
        'Companies: our packages and the partnership offer are on the For Companies page. This message goes straight to our fundraising team.',
      ),
      shortcutLabel: both('For Companies →'),
      shortcutUrl: '/partners',
    },
    {
      id: 'subject-media',
      name: both('Media'),
      routeEmail: 'pr@eestec.mk',
      teamLabel: both('PR team'),
      routeNote: none,
      shortcutLabel: none,
      shortcutUrl: '',
    },
    {
      id: 'subject-committee',
      name: both('Other committee'),
      routeEmail: 'chair@eestec.mk',
      teamLabel: both('chairperson'),
      routeNote: none,
      shortcutLabel: none,
      shortcutUrl: '',
    },
  ],
  map: {
    pinLabel: both('FEEIT · Room 117'),
    placeName: both('FEEIT, Ss. Cyril and Methodius University'),
    placeAddress: both('Rugjer Boshkovikj 18, 1000 Skopje · Karpoš'),
    lat: 42.0045,
    lng: 21.4087,
    zoom: 16,
  },
};
