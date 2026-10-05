import type { Localized } from '@/shared/types/localized';

/** "Category" on the canvas: Local or International (the /events tabs). */
export const EVENT_SCOPES = ['local', 'international'] as const;
export type EventScope = (typeof EVENT_SCOPES)[number];

/** Draft: only admins see it. Published: listed. Hidden: reachable by link, not listed. */
export const CONTENT_STATUSES = ['draft', 'published', 'hidden'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** Upcoming until the end date has passed, then past (computed, never stored; D1). */
export type EventTiming = 'upcoming' | 'past';

/** Board-editable list (Admin › Events › Event types). The order is the order of the filters. */
export type EventType = { id: string; name: Localized };

/** Board-editable list of topics ("Pick any · used for filters"). */
export type EventTopic = { id: string; name: Localized };

/** An event type or topic with how many events use it (Event types screen). */
export type TaxonomyUsage<T> = T & { eventCount: number };

/** Who saved last ("Ana Trajkovska"). */
export type EventEditor = { userId: string; name: string };

/**
 * An image used by an event: the file comes from the Media library, the texts belong to this use
 * (alt text is required before publishing; null = still missing, '' = decorative).
 */
export type EventImage = { mediaId: string; alt: string | null; credit?: string };

export type ApplyVia = 'form' | 'external';

/** One day of the programme ("Day 3 · Mon 9 Nov · Lab: models on microcontrollers"). */
export type AgendaItem = {
  id: string;
  /** YYYY-MM-DD; "Day N" is counted from the start date. null: no date (e.g. "Before the event"). */
  date: string | null;
  title: Localized;
  text: Localized;
};

/** Applications box of the edit form. The application form itself is built in M7. */
export type EventApplicationSettings = {
  enabled: boolean;
  via: ApplyVia;
  externalUrl: string;
  /** ISO date-time, or null: open as soon as the event is published. */
  opensAt: string | null;
  deadline: string | null;
  /** "Results by 25 Oct" (YYYY-MM-DD), optional. */
  resultsOn: string | null;
  maxParticipants: number | null;
  waitlist: boolean;
};

/** The full event as the admin edits it (write model; texts in both languages, D8). */
export type EventRecord = {
  id: string;
  slug: string;
  title: Localized;
  /** Cards and the SEO description. */
  shortDescription: Localized;
  scope: EventScope;
  typeId: string;
  topicIds: string[];
  /** ISO date-times with offset. All-day events start at 00:00 and end at 23:59 (Skopje). */
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  /** Full place on the event page ("Skopje & Ohrid, North Macedonia"). */
  location: Localized;
  /** Short place on cards ("Skopje & Ohrid"); empty: cards use the location (D6). */
  city: Localized;
  country: Localized;
  /**
   * null = LC Skopje ("Organized by LC Skopje" badge); otherwise who organized it ("LC Kraków"),
   * possibly empty when unknown.
   */
  organizer: string | null;
  /** Rich text (sanitized HTML). */
  description: Localized;
  agenda: AgendaItem[];
  /** "Who can apply": rich text, usually a list. */
  requirements: Localized;
  /** "€60" / "Free for FEEIT students", and what it covers. Both empty: no fee section. */
  fee: { price: Localized; note: Localized };
  /** Questions about the event ("aiedge@eestec.mk"); empty: the main e-mail from Settings. */
  contactEmail: string;
  /** After the event: "24 students from 14 countries" (both optional). */
  participantCount: number | null;
  countryCount: number | null;
  cover: EventImage | null;
  gallery: EventImage[];
  infoPackId: string | null;
  videoUrl: string;
  status: ContentStatus;
  /** Scheduled publishing: a published event stays off the site until then. */
  publishAt: string | null;
  /** "Show as Next up on Home". */
  nextUp: boolean;
  applications: EventApplicationSettings;
  seo: { title: Localized; description: Localized; shareImageId: string | null };
  createdAt: string;
  updatedAt: string;
  updatedBy: EventEditor;
};

/** Applications column: a count (M7 replaces the sample numbers), "External" or "—". */
export type ApplicationsSummary =
  { kind: 'none' } | { kind: 'external' } | { kind: 'count'; count: number; full: boolean };

/** One row of /admin/events. */
export type AdminEventRow = {
  id: string;
  slug: string;
  /** The Macedonian title: the required one, always there (sample content is English for now). */
  title: string;
  timing: EventTiming;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  typeName: string;
  scope: EventScope;
  status: ContentStatus;
  cover: { mediaId: string; alt: string | null } | null;
  applications: ApplicationsSummary;
  updatedAt: string;
  updatedBy: EventEditor;
};

export type AdminEventCounts = { all: number; upcoming: number; past: number };

export type AdminEventSort = 'title' | '-title' | 'dates' | '-dates' | 'smart';

export type AdminEventsQuery = {
  timing?: EventTiming;
  q?: string;
  status?: ContentStatus;
  typeId?: string;
  year?: number;
  scope?: EventScope;
  /** Event managers: only these events (D18). */
  onlyIds?: readonly string[];
  sort: AdminEventSort;
  page: number;
  pageSize: number;
  now: Date;
};

/** Filters of the list that depend on the data (years with events). */
export type AdminEventFacets = { years: number[] };

/** An event as a choice in admin forms ("Events they manage"). */
export type EventOption = { id: string; title: string; startsAt: string };
