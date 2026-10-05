// SAMPLE DATA — transcribed from handoff/design-source: Footer.dc.html, ContactPage.dc.html,
// AdminSettings.dc.html. Bracketed legal values are the canvas placeholders. Macedonian fields
// reuse the English sample copy until the board supplies Macedonian content (D14).
// SEO: titles from AdminSettings › SEO per page; only Home has a description on the canvas, the
// others are empty ("Missing description") until the board writes them. Notification
// recipients reuse the board e-mails from Contact & legal.
import type { ImageAsset, PageSeo, SettingsRecord } from '../../types';

const brand = (mediaId: string, fileName: string, height: number, alt: string): ImageAsset => ({
  mediaId,
  src: `/brand/${fileName}`,
  fileName,
  width: 4167,
  height,
  alt,
});

const seo = (title: string, description = ''): PageSeo => ({
  title: { mk: title, en: title },
  description: { mk: description, en: description },
  shareImage: null,
});

export const settingsFixture: SettingsRecord = {
  siteName: 'EESTEC LC Skopje',
  branding: {
    fullColor: brand('media-logo-red', 'LC_Skopje_red.png', 2942, 'EESTEC LC Skopje'),
    white: brand('media-logo-white', 'LC_Skopje_white.png', 2942, 'EESTEC LC Skopje'),
    icon: brand('media-logo-icon', 'eestecredsquare.png', 4167, 'EESTEC'),
  },
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
    bankAccount: '[000-0000000000-00]',
    bankName: '[Bank name]',
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
  seo: {
    home: seo(
      'EESTEC LC Skopje: engineering students across Europe',
      'Workshops, exchanges and trainings for electrical engineering and computer science students at FEEIT and across Europe. Join us on Wednesdays.',
    ),
    events: seo('Events: workshops, exchanges and trainings'),
    upcoming: seo('Upcoming events: apply now'),
    journey: seo('Your EESTEC journey, step by step'),
    join: seo('Become an EESTECer'),
    partners: seo('Partner with EESTEC LC Skopje'),
    contact: seo('Contact EESTEC LC Skopje'),
    members: seo('Members'),
    memories: seo('Memories'),
    submit: seo('Ideas & feedback'),
    privacy: seo('Privacy policy'),
  },
  notifications: {
    contactMessages: { enabled: true, recipients: ['hello@eestec.mk'] },
    partnerInquiries: { enabled: true, recipients: ['partners@eestec.mk'] },
    membershipApplications: { enabled: true, recipients: ['members@eestec.mk'] },
    eventApplications: { enabled: true, recipients: ['hello@eestec.mk'] },
    memberRegistrations: { enabled: true, recipients: ['members@eestec.mk'] },
    memoriesToApprove: { enabled: true, recipients: ['pr@eestec.mk'] },
    ideasAndFeedback: { enabled: true, recipients: ['hello@eestec.mk'] },
  },
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
