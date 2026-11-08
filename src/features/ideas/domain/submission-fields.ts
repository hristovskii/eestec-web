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
  impressionMin: 1,
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
