import type { SpamVerdict } from '@/shared/forms/spam-guard';

// /submit: what is asked, how each tab's FormData is read, and what goes into the one schema the
// browser and the server both check. Messages are keys of `ideas.form.errors`.

export const IDEA_LIMITS = {
  title: 100,
  description: 2000,
  descriptionMin: 20,
  name: 100,
  email: 254,
  attachmentBytes: 10 * 1024 * 1024,
  /** Photos of a feedback: the browser makes each a JPEG of at most 2000 px first. */
  photos: 10,
  photoBytes: 10 * 1024 * 1024,
  memoryTitle: 100,
  otherEvent: 120,
  impression: 2000,
  impressionMin: 10,
} as const;

/** Field names of both tabs (ids in the page are prefixed with `sf-`). */
export const SUBMIT_FIELDS = {
  type: 'type',
  title: 'title',
  description: 'description',
  attachment: 'attachment',
  event: 'event',
  otherEvent: 'otherEvent',
  rating: 'rating',
  impression: 'impression',
  photos: 'photos',
  name: 'name',
  email: 'email',
  consent: 'consent',
  anonymous: 'anonymous',
  asMemory: 'asMemory',
  memoryTitle: 'memoryTitle',
} as const;

/** What the sender picked as "Other: not in the list". */
export const OTHER_EVENT = '__other__';

export const RATING_NAMES = ['poor', 'okay', 'good', 'great', 'amazing'] as const;

export type SubmitFailure = 'spam' | 'tooFast' | 'unexpected';
export const submitFailureFor = (verdict: Exclude<SpamVerdict, 'ok'>): 'spam' | 'tooFast' =>
  verdict === 'bot' ? 'spam' : 'tooFast';

/** What the browser knows of a picked file: enough to check it before it is sent. */
export type FileInfo = { name: string; size: number; type: string };

export type IdeaValues = {
  type: string;
  title: string;
  description: string;
  attachment: FileInfo | null;
  name: string;
  email: string;
  consent: boolean;
  anonymous: boolean;
};

export type ImpressionValues = {
  /** A listed event's id, `__other__`, or '' (not chosen). */
  event: string;
  otherEvent: string;
  rating: number | null;
  impression: string;
  photos: FileInfo[];
  name: string;
  email: string;
  consent: boolean;
  anonymous: boolean;
  asMemory: boolean;
  memoryTitle: string;
};

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
};

const fileInfo = (value: FormDataEntryValue): FileInfo | null =>
  typeof value === 'string' || value.size === 0
    ? null
    : { name: value.name, size: value.size, type: value.type };

export function readIdeaForm(data: FormData): IdeaValues {
  const file = data.get(SUBMIT_FIELDS.attachment);
  return {
    type: text(data, SUBMIT_FIELDS.type),
    title: text(data, SUBMIT_FIELDS.title),
    description: text(data, SUBMIT_FIELDS.description),
    attachment: file ? fileInfo(file) : null,
    name: text(data, SUBMIT_FIELDS.name),
    email: text(data, SUBMIT_FIELDS.email),
    consent: data.get(SUBMIT_FIELDS.consent) !== null,
    anonymous: data.get(SUBMIT_FIELDS.anonymous) !== null,
  };
}

export function readImpressionForm(data: FormData): ImpressionValues {
  const rating = Number(text(data, SUBMIT_FIELDS.rating));
  return {
    event: text(data, SUBMIT_FIELDS.event),
    otherEvent: text(data, SUBMIT_FIELDS.otherEvent),
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    impression: text(data, SUBMIT_FIELDS.impression),
    photos: data
      .getAll(SUBMIT_FIELDS.photos)
      .map(fileInfo)
      .filter((photo): photo is FileInfo => photo !== null),
    name: text(data, SUBMIT_FIELDS.name),
    email: text(data, SUBMIT_FIELDS.email),
    consent: data.get(SUBMIT_FIELDS.consent) !== null,
    anonymous: data.get(SUBMIT_FIELDS.anonymous) !== null,
    asMemory: data.get(SUBMIT_FIELDS.asMemory) !== null,
    memoryTitle: text(data, SUBMIT_FIELDS.memoryTitle),
  };
}

/** What the form shows after sending, in the words of the page they used. */
export type SubmitReceipt = {
  kind: 'idea' | 'impression';
  /** "Bojan" for "Thanks, Bojan!"; null: anonymous or no name. */
  firstName: string | null;
  /** Where a copy was sent; null: nothing was sent. */
  email: string | null;
  anonymous: boolean;
  /** An impression that also went to the board as a Memory. */
  asMemory: boolean;
  /** The event of an impression (its name in the language of the page, and its address when it is listed). */
  eventTitle: string;
  eventSlug: string | null;
};
