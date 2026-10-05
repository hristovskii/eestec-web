// SAMPLE DATA — transcribed from handoff/design-source: Footer.dc.html, ContactPage.dc.html,
// AdminSettings.dc.html. Bracketed legal values are the canvas placeholders. Macedonian fields
// reuse the English sample copy until the board supplies Macedonian content (D14).
import type { SettingsRecord } from '../../types';

export const settingsFixture: SettingsRecord = {
  siteName: 'EESTEC LC Skopje',
  footerTagline: {
    mk: "The Skopje branch of the Electrical Engineering STudents' European assoCiation, based at FEEIT, Ss. Cyril and Methodius University.",
    en: "The Skopje branch of the Electrical Engineering STudents' European assoCiation, based at FEEIT, Ss. Cyril and Methodius University.",
  },
  contact: {
    mainEmail: 'hello@eestec.mk',
    address: {
      mk: 'FEEIT, Rugjer Boshkovikj 18, 1000 Skopje, North Macedonia',
      en: 'FEEIT, Rugjer Boshkovikj 18, 1000 Skopje, North Macedonia',
    },
    officeRoom: { mk: 'Room 117, ground floor, FEEIT', en: 'Room 117, ground floor, FEEIT' },
  },
  weeklyMeeting: {
    day: 'wednesday',
    time: '18:00',
    room: { mk: 'Room 117, FEEIT', en: 'Room 117, FEEIT' },
    showOnHome: true,
  },
  boardRoles: [
    { id: 'role-chair', title: 'Chairperson', email: 'chair@eestec.mk' },
    { id: 'role-partners', title: 'External relations & partners', email: 'partners@eestec.mk' },
    { id: 'role-members', title: 'Membership & internal affairs', email: 'members@eestec.mk' },
    { id: 'role-treasurer', title: 'Treasurer', email: 'treasurer@eestec.mk' },
    { id: 'role-pr', title: 'PR & media', email: 'pr@eestec.mk' },
  ],
  socialLinks: [
    { platform: 'instagram', handle: '@eestec_skopje', url: 'https://instagram.com/eestec_skopje' },
    { platform: 'facebook', handle: 'EESTEC LC Skopje', url: 'https://facebook.com/eestec.skopje' },
    {
      platform: 'linkedin',
      handle: 'EESTEC LC Skopje',
      url: 'https://linkedin.com/company/eestec-lc-skopje',
    },
  ],
  legal: {
    fullName: '[Full registered name of the association]',
    shortName: 'EESTEC LC Skopje',
    registrationNumber: '[0000000]',
    taxNumber: '[MK0000000000000]',
    bankAccount: '[000-0000000000-00] · [Bank name]',
    registeredSeat: 'Rugjer Boshkovikj 18, 1000 Skopje',
  },
  events: {
    deadlineSoonHours: 72,
    justEndedDays: 14,
    defaultMaxParticipants: 24,
    defaultWaitlistEnabled: true,
    autoCloseApplications: true,
  },
  retentionMonths: 12,
  privacy: {
    title: { mk: 'Политика за приватност', en: 'Privacy policy' },
    // D17: placeholder until the board supplies the real text. Clearly marked on the page.
    body: {
      mk: [
        'ПРИВРЕМЕН ТЕКСТ. Одборот ќе ја достави вистинската политика за приватност пред објавувањето на страницата.',
        'Тука ќе пишува кои лични податоци ги собираме преку формуларите, зошто, колку долго ги чуваме (според поставката за чување податоци) и како да побарате нивно бришење.',
      ],
      en: [
        'PLACEHOLDER TEXT. The board will supply the real privacy policy before the site goes live.',
        'It will explain which personal data the forms collect, why, how long it is kept (see the retention setting) and how to ask for it to be deleted.',
      ],
    },
    isPlaceholder: true,
  },
};
