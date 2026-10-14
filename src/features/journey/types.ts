import type { Localized } from '@/shared/types/localized';
import type { AnyMedia, MediaRef } from '@/shared/types/media';

/** Icons a step can use: the six of the canvas first (JourneyStep), then a few more. */
export const JOURNEY_ICONS = [
  'user-plus',
  'calendar',
  'heart',
  'globe',
  'flag',
  'link',
  'users',
  'graduation',
  'lightbulb',
  'trophy',
] as const;
export type JourneyIcon = (typeof JOURNEY_ICONS)[number];

/** Internal path ("/join") or https link. */
export type JourneyButton = { label: Localized; href: string };

export type JourneyBullet = { id: string; text: Localized };

export type JourneyStep = {
  id: string;
  icon: JourneyIcon;
  title: Localized;
  /** One sentence, always shown. */
  text: Localized;
  button: JourneyButton;
  /** Shown when the step is expanded (spec: 2–3). */
  bullets: JourneyBullet[];
  photo: MediaRef | null;
  /** One optional member quote; the link to a member profile comes with Phase 2. */
  quote: { text: Localized; author: Localized } | null;
};

/** Everything Admin › Pages › Journey edits, in both languages. */
export type JourneyRecord = {
  hero: { eyebrow: Localized; title: Localized; lead: Localized };
  steps: JourneyStep[];
  /** The red band at the end ("Ready for step one?"). */
  cta: { title: Localized; text: Localized; button: JourneyButton };
};

export type JourneyInput = JourneyRecord;

/** What the public pages show: texts in the language of the page, photos ready for MediaImage. */
export type PublicJourney = {
  hero: { eyebrow: string; title: string; lead: string };
  steps: {
    id: string;
    /** 1-based, shown as "STEP 03". */
    n: number;
    icon: JourneyIcon;
    title: string;
    text: string;
    /** null: the link goes to a page that Phase 1 does not have (members), or there is none. */
    button: { label: string; href: string } | null;
    bullets: string[];
    photo: AnyMedia | null;
    quote: { text: string; author: string } | null;
  }[];
  cta: { title: string; text: string; button: { label: string; href: string } | null };
};
