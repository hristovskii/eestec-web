import type { Admission } from '@/features/events';
import type { Localized } from '@/shared/types/localized';

// Event applications (docs/ARCHITECTURE.md §3): per-event form definitions, the applications sent
// through them, and how many places are taken.

/** Field types of the form builder (spec 03): text, long text, select, checkbox, file upload. */
export const APPLICATION_FIELD_TYPES = ['text', 'long_text', 'select', 'checkbox', 'file'] as const;
export type ApplicationFieldType = (typeof APPLICATION_FIELD_TYPES)[number];

export type ApplicationFieldOption = { value: string; label: Localized };

/**
 * One question of an event's application form. Full name, e-mail and the consent checkbox are
 * always there (they are columns of the application, not questions).
 */
export type ApplicationField = {
  /** Stable key: answers are stored under it, so renaming a label keeps old answers. */
  key: string;
  type: ApplicationFieldType;
  label: Localized;
  required: boolean;
  /** Help text under the field ("Max 2,000 characters." is added automatically). */
  help: Localized;
  placeholder: Localized;
  /** text: 'phone' gives the phone keyboard and autocomplete. */
  format?: 'plain' | 'phone';
  /** text and long_text. */
  maxLength?: number;
  /** select. */
  options?: ApplicationFieldOption[];
  /** select: a dropdown, or buttons for a few short options (Yes / No, T-shirt size). */
  appearance?: 'dropdown' | 'buttons';
};

/** An event's application form (form builder). Events without one use the default fields. */
export type ApplicationForm = {
  eventId: string;
  /** First sentence of the intro ("Takes about 10 minutes."); the deadline is added automatically. */
  intro: Localized;
  fields: ApplicationField[];
};

/** The same field in one language, for the public form. */
export type PublicApplicationField = Omit<ApplicationField, 'label' | 'help' | 'placeholder' | 'options'> & {
  label: string;
  help: string;
  placeholder: string;
  options?: { value: string; label: string }[];
};

export type PublicApplicationForm = { intro: string; fields: PublicApplicationField[] };

/** Statuses of an application (spec 03). */
export const APPLICATION_STATUSES = ['pending', 'accepted', 'rejected', 'waitlist'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** A CV or other upload (private bucket; signed links only, data-model.md). */
export type ApplicationFile = { fileId: string; fileName: string; size: number };

export type AnswerValue = string | boolean | ApplicationFile;

export type Application = {
  id: string;
  eventId: string;
  /** "AIE-2026-0042": shown to the applicant and in the admin. */
  reference: string;
  name: string;
  email: string;
  answers: Record<string, AnswerValue>;
  status: ApplicationStatus;
  /** 1 = first in line; only while on the waitlist. */
  waitlistPosition: number | null;
  /** Language the applicant used (confirmation e-mail). */
  locale: 'mk' | 'en';
  consentAt: string;
  createdAt: string;
  /** First opened in the admin; null = "new" (dashboard and the list). */
  readAt: string | null;
};

/** What a public form submission creates (the repository sets id, reference, status, position). */
export type ApplicationInput = Pick<Application, 'eventId' | 'name' | 'email' | 'answers' | 'locale'> & {
  /** Prefix of the reference ("AIE"); the year comes from the start of the event. */
  referencePrefix: string;
  eventStartsAt: string;
  /** Places of the event: when they are all taken, the application joins the waitlist. */
  maxParticipants: number | null;
  waitlist: boolean;
  /** First come: accepted at once while places are free and nobody is waiting (D22). */
  admission: Admission;
};

/** Places per event: accepted applications fill them; the waitlist is counted separately. */
export type Availability = { taken: number; waitlist: number };

// ─── Admin (Applications list) ───

/** One row of /admin/applications?event= (the answers are in the detail). */
export type ApplicationRow = Pick<
  Application,
  'id' | 'eventId' | 'reference' | 'name' | 'email' | 'status' | 'waitlistPosition' | 'createdAt' | 'readAt'
>;

export type ApplicationSort = 'newest' | 'oldest' | 'name' | 'waitlist';

export type ApplicationsQuery = {
  eventId: string;
  status?: ApplicationStatus;
  /** Name, e-mail or reference. */
  q?: string;
  sort: ApplicationSort;
  page: number;
  pageSize: number;
};

/** Tab counts of one event's list (they ignore the status filter, not the search). */
export type StatusCounts = Record<ApplicationStatus | 'all', number>;

/** Per event, for the overview, the Events list and the dashboard. */
export type ApplicationsSummary = {
  eventId: string;
  total: number;
  /** Not opened in the admin yet. */
  newCount: number;
  byStatus: Record<ApplicationStatus, number>;
};

/** A stored upload with its content (admin download only). */
export type StoredUpload = ApplicationFile & { type: string; bytes: Uint8Array };
