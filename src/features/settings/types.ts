import type { Localized } from '@/shared/types/localized';

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin';

/** Settings › Contact & legal › Board roles. Also used on /contact and in the footer. */
export type BoardRole = { id: string; title: string; email: string };

export type SocialLink = { platform: SocialPlatform; handle: string; url: string };

export type LegalInfo = {
  fullName: string;
  shortName: string;
  registrationNumber: string;
  taxNumber: string;
  bankAccount: string;
  registeredSeat: string;
};

/** Settings › Events (decided defaults: 72 h, 14 days, 24 places, waitlist on, auto-close on). */
export type EventSettings = {
  deadlineSoonHours: number;
  justEndedDays: number;
  defaultMaxParticipants: number;
  defaultWaitlistEnabled: boolean;
  /** D1: replaces auto_archive_events. */
  autoCloseApplications: boolean;
};

/** Read model: everything the site chrome needs, resolved for one locale. */
export type SiteSettings = {
  siteName: string;
  footerTagline: string;
  contact: {
    mainEmail: string;
    address: string;
    officeRoom: string;
  };
  weeklyMeeting: { day: Weekday; time: string; room: string; showOnHome: boolean };
  boardRoles: BoardRole[];
  socialLinks: SocialLink[];
  legal: LegalInfo;
  events: EventSettings;
  /** D17: retention for e-mails sent with ideas and contact messages. */
  retentionMonths: number;
  /** Year for the footer copyright line (from the server clock). */
  currentYear: number;
};

export type PrivacyPolicy = {
  title: string;
  /** Paragraphs. Rich text arrives with the admin editor (M4). */
  body: string[];
  /** D17: the text is a placeholder until the board supplies it. */
  isPlaceholder: boolean;
  /** Language the body is actually in (EN falls back to MK). */
  lang: 'mk' | 'en';
};

/** Stored shape (write model): board-editable texts are Localized. */
export type SettingsRecord = Omit<
  SiteSettings,
  'footerTagline' | 'contact' | 'weeklyMeeting' | 'currentYear'
> & {
  footerTagline: Localized;
  contact: { mainEmail: string; address: Localized; officeRoom: Localized };
  weeklyMeeting: { day: Weekday; time: string; room: Localized; showOnHome: boolean };
  privacy: { title: Localized; body: Localized<string[]>; isPlaceholder: boolean };
};
