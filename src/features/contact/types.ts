import type { Localized } from '@/shared/types/localized';

/** The sections of the Contact page whose heading the board can reword, in page order. */
export const CONTACT_HEADINGS = ['info', 'board', 'map', 'social', 'legal'] as const;
export type ContactHeading = (typeof CONTACT_HEADINGS)[number];

/**
 * One subject of the form (data-model.md: contact_subjects). The subject decides who receives the
 * message; two subjects can also suggest a faster page (Membership → Join Us, Partnership → For Companies).
 */
export type ContactSubject = {
  id: string;
  name: Localized;
  /** Where messages with this subject go. */
  routeEmail: string;
  /** "our membership team": how the confirmation names who got the message. */
  teamLabel: Localized;
  /** The grey note under the select; empty: no note. */
  routeNote: Localized;
  /** The link in that note ("Join Us →") and where it goes ("/join#apply"); empty: no link. */
  shortcutLabel: Localized;
  shortcutUrl: string;
};

/** A card next to the hero ("Want to join? Join Us →"). */
export type ContactShortcut = { id: string; eyebrow: Localized; label: Localized; href: string };

/** Everything Admin › Pages › Contact edits, in both languages. The details (address, e-mails, social, legal) come from Settings. */
export type ContactPageRecord = {
  hero: { title: Localized; lead: Localized };
  shortcuts: ContactShortcut[];
  headings: Record<ContactHeading, Localized>;
  form: { title: Localized; intro: Localized };
  subjects: ContactSubject[];
  map: {
    /** "FEEIT · Room 117": the label of the pin. */
    pinLabel: Localized;
    /** The card on the map: the place and its address line. */
    placeName: Localized;
    placeAddress: Localized;
    lat: number;
    lng: number;
    zoom: number;
  };
};

export type ContactPageInput = ContactPageRecord;

export const MAP_ZOOM = [3, 18] as const;

/** What the public page shows: texts in the language of the page. The address each subject goes to stays on the server. */
export type PublicContact = {
  hero: { title: string; lead: string };
  shortcuts: { id: string; eyebrow: string; label: string; href: string }[];
  headings: Record<ContactHeading, string>;
  form: { title: string; intro: string };
  subjects: {
    id: string;
    name: string;
    /** "membership team". */
    teamLabel: string;
    /** The note under the select, with its link; null: nothing to suggest. */
    suggestion: { note: string; label: string; href: string } | null;
  }[];
  map: {
    pinLabel: string;
    placeName: string;
    placeAddress: string;
    lat: number;
    lng: number;
    zoom: number;
  };
};
