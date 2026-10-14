import type { AnyMedia } from '@/shared/types/media';
import type { Localized } from '@/shared/types/localized';

/**
 * Sections of the Home page that the board can reorder and hide. The hero is always first and the
 * partner strip always sits directly above the footer (specs/01-home.md), so neither is listed.
 * "meeting" shows only while Settings › Contact & legal › "Show on Home" is on.
 */
export const HOME_SECTION_KEYS = [
  'about',
  'tradition',
  'numbers',
  'map',
  'meeting',
  'latest',
  'journey',
] as const;
export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

export type HomeSectionSetting = { key: HomeSectionKey; visible: boolean };

/** Icons an activity card can use (the first six are the canvas's; drawn with lucide, see components/activity-icon.tsx). */
export const ACTIVITY_ICONS = [
  'cpu',
  'exchange',
  'zap',
  'message',
  'trophy',
  'users',
  'graduation',
  'globe',
  'lightbulb',
  'book',
  'calendar',
  'plane',
] as const;
export type ActivityIcon = (typeof ACTIVITY_ICONS)[number];

/** A Media library file with the alt text of this use (alt is required, in both languages' fallback rules). */
export type HomeImage = { mediaId: string; alt: Localized };

/** Internal path ("/join") or https link. */
export type HomeButton = { label: Localized; href: string };

export type HomeHero = {
  /** Small line above the headline; empty: not shown. */
  eyebrow: Localized;
  headline: Localized;
  subtitle: Localized;
  primary: HomeButton;
  secondary: HomeButton;
  /** Optional background photo; none: the red hero of the design. */
  image: HomeImage | null;
};

export type HomeActivity = { id: string; icon: ActivityIcon; title: Localized; text: Localized };

export type HomeMilestone = {
  id: string;
  year: number;
  title: Localized;
  text: Localized;
  photo: HomeImage | null;
};

/** "35 Local Committees", "5,000+ members": a whole number with an optional suffix, counted up on Home. */
export type HomeStat = { id: string; label: Localized; value: number; suffix: string };

/** Everything Admin › Pages › Home edits, in both languages. */
export type HomeRecord = {
  hero: HomeHero;
  /** "What is EESTEC?": paragraphs separated by a blank line. */
  about: { body: Localized };
  activities: HomeActivity[];
  milestones: HomeMilestone[];
  stats: HomeStat[];
  layout: HomeSectionSetting[];
};

export type HomeInput = HomeRecord;

/** What the public Home shows: texts in the language of the page, photos ready for MediaImage. */
export type PublicHome = {
  hero: {
    eyebrow: string;
    headline: string;
    subtitle: string;
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
    image: AnyMedia | null;
  };
  about: {
    paragraphs: string[];
    activities: { id: string; icon: ActivityIcon; title: string; text: string }[];
  };
  tradition: { id: string; year: number; title: string; text: string; photo: AnyMedia | null }[];
  stats: { id: string; label: string; value: number; suffix: string }[];
};
