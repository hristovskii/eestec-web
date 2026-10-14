import type { Localized } from '@/shared/types/localized';

/** Icons of the cards on the Join page (the canvas's twelve, plus two). */
export const JOIN_ICONS = [
  'users',
  'clock',
  'wallet',
  'calendar',
  'globe',
  'chip',
  'chat',
  'clip',
  'briefcase',
  'heart',
  'flag',
  'shield',
  'graduation',
  'lightbulb',
] as const;
export type JoinIcon = (typeof JOIN_ICONS)[number];

/** One line of a list the board writes (requirements, rights, obligations, form options). */
export type JoinLine = { id: string; text: Localized };

export type JoinCard = { id: string; icon: JoinIcon; title: Localized; text: Localized };

/** The sections the sub-nav jumps to, in page order. */
export const JOIN_SECTIONS = ['why', 'who', 'how', 'rules', 'faq', 'apply'] as const;
export type JoinSection = (typeof JOIN_SECTIONS)[number];

/** Everything Admin › Pages › Join Us edits, in both languages. */
export type JoinRecord = {
  hero: { eyebrow: Localized; title: Localized; lead: Localized };
  /** The H2 of each section ("What you get out of it"). */
  headings: Record<JoinSection, Localized>;
  /** "At a glance" next to the hero: free items; the next info session is added from Settings. */
  glance: { id: string; icon: JoinIcon; label: Localized; value: Localized }[];
  benefits: JoinCard[];
  eligibility: { items: JoinLine[]; noteTitle: Localized; noteText: Localized };
  steps: { id: string; title: Localized; text: Localized }[];
  /** "600 MKD" "/ academic year"; an empty amount hides the fee card. */
  fee: { amount: Localized; per: Localized; note: Localized };
  rules: {
    intro: Localized;
    rights: JoinLine[];
    duties: JoinLine[];
    conduct: JoinCard[];
    /** "Going to an international event": before, during and after. */
    international: { before: JoinLine[]; during: JoinLine[]; after: JoinLine[] };
  };
  /** Official PDFs from the Media library. */
  documents: { id: string; title: Localized; mediaId: string }[];
  faq: { id: string; question: Localized; answer: Localized }[];
  apply: {
    /** Applications are being taken: the form shows; off: the closed card shows. */
    open: boolean;
    /** "February 2027". */
    nextRound: Localized;
    intro: Localized;
    faculties: JoinLine[];
    interests: JoinLine[];
    heardFrom: JoinLine[];
  };
};

export type JoinInput = JoinRecord;

/** What the public page shows: texts in the language of the page. */
export type PublicJoin = {
  hero: { eyebrow: string; title: string; lead: string };
  headings: Record<JoinSection, string>;
  glance: { id: string; icon: JoinIcon; label: string; value: string }[];
  benefits: { id: string; icon: JoinIcon; title: string; text: string }[];
  eligibility: { items: string[]; noteTitle: string; noteText: string };
  steps: { id: string; title: string; text: string }[];
  fee: { amount: string; per: string; note: string } | null;
  rules: {
    intro: string;
    rights: string[];
    duties: string[];
    conduct: { id: string; icon: JoinIcon; title: string; text: string }[];
    international: { before: string[]; during: string[]; after: string[] };
  };
  documents: {
    id: string;
    title: string;
    /** null: the library item is a SAMPLE without a file. */
    file: { src: string; size: number; updatedAt: string } | null;
    size: number;
    updatedAt: string;
  }[];
  faq: { id: string; question: string; answer: string }[];
  apply: {
    open: boolean;
    nextRound: string;
    intro: string;
    faculties: { value: string; label: string }[];
    interests: { value: string; label: string }[];
    heardFrom: { value: string; label: string }[];
  };
};
