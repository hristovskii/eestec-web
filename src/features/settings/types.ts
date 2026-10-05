import type { Localized } from '@/shared/types/localized';

export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

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
  bankName: string;
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

/** An image picked from the Media library (logos, share images). */
export type ImageAsset = {
  /** null: the file shipped with the site (public/brand), not a library upload. */
  mediaId: string | null;
  src: string;
  fileName: string;
  width: number;
  height: number;
  alt: string;
};

/** Settings › Branding: the provided files, never redrawn. */
export type Branding = { fullColor: ImageAsset; white: ImageAsset; icon: ImageAsset };

/** Pages with their own title, description and share image (Settings › SEO). */
export const SEO_PAGES = [
  'home',
  'events',
  'upcoming',
  'journey',
  'join',
  'partners',
  'contact',
  'members',
  'memories',
  'submit',
  'privacy',
] as const;
export type SeoPageKey = (typeof SEO_PAGES)[number];
/** Phase 2 pages: shown in Settings › SEO only when member accounts are on. */
export const PHASE2_SEO_PAGES: readonly SeoPageKey[] = ['members', 'memories', 'submit'];

export type PageSeo = { title: Localized; description: Localized; shareImage: ImageAsset | null };

/** Settings › E-mail notifications: who hears about new submissions. */
export const NOTIFICATION_KINDS = [
  'contactMessages',
  'partnerInquiries',
  'membershipApplications',
  'eventApplications',
  'memberRegistrations',
  'memoriesToApprove',
  'ideasAndFeedback',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
export const PHASE2_NOTIFICATIONS: readonly NotificationKind[] = [
  'memberRegistrations',
  'memoriesToApprove',
  'ideasAndFeedback',
];
export type NotificationSetting = { enabled: boolean; recipients: string[] };

/** Read model: everything the site chrome needs, resolved for one locale. */
export type SiteSettings = {
  siteName: string;
  footerTagline: string;
  branding: Branding;
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

/** One page's SEO, resolved for a locale (generateMetadata). */
export type ResolvedPageSeo = { title: string; description: string; shareImage: ImageAsset | null };

export type PrivacyPolicy = {
  title: string;
  /** Paragraphs. Rich text arrives with the Contact page editor (M12). */
  body: string[];
  /** D17: the text is a placeholder until the board supplies it. */
  isPlaceholder: boolean;
  /** Language the body is actually in (EN falls back to MK). */
  lang: 'mk' | 'en';
};

/** Stored shape (write model, Admin › Settings): board-editable texts are Localized. */
export type SettingsRecord = Omit<
  SiteSettings,
  'footerTagline' | 'contact' | 'weeklyMeeting' | 'currentYear'
> & {
  footerTagline: Localized;
  contact: { mainEmail: string; address: Localized; officeRoom: Localized };
  weeklyMeeting: { day: Weekday; time: string; room: Localized; showOnHome: boolean };
  seo: Record<SeoPageKey, PageSeo>;
  notifications: Record<NotificationKind, NotificationSetting>;
  privacy: { title: Localized; body: Localized<string[]>; isPlaceholder: boolean };
};

/** What Admin › Settings edits (everything except the privacy text, edited with Contact in M12). */
export type SettingsInput = Omit<SettingsRecord, 'privacy'>;
