import type { Localized } from '@/shared/types/localized';

/** The four statuses of an idea and of a piece of feedback (decided list, never public). */
export const SUBMISSION_STATUSES = ['new', 'under_review', 'accepted', 'archived'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** One kind of idea ("New event", "Workshop topic"…), editable in Admin › Ideas › Form settings. */
export type IdeaType = { id: string; name: Localized };

/** A file that came with a submission (an idea's attachment, a photo of a feedback), kept private. */
export type SubmissionFile = { id: string; name: string; size: number; mime: string };

/** Who sent it. Anonymous: nothing of this is stored (D28), not even for a signed-in member. */
export type Sender = {
  name: string | null;
  email: string | null;
  /** When they agreed that the name and e-mail are stored; null: no e-mail. */
  consentAt: string | null;
  /** The member's account when they were signed in and did not choose to be anonymous. */
  userId: string | null;
  isAnonymous: boolean;
};

type Handling = {
  status: SubmissionStatus;
  ownerId: string | null;
  /** The owner's name as the board saw it when they took it (shown in lists). */
  ownerName: string | null;
};

/** data-model.md: ideas. */
export type Idea = Sender &
  Handling & {
    id: string;
    typeId: string;
    title: string;
    description: string;
    attachment: SubmissionFile | null;
    /** The hidden event draft "Accept and create event draft" made, when it did. */
    eventDraftId: string | null;
    locale: 'mk' | 'en';
    createdAt: string;
  };

/** data-model.md: feedback (an impression after an event). Never public. */
export type Feedback = Sender &
  Handling & {
    id: string;
    /** A listed event, or null with `otherEventName`. */
    eventId: string | null;
    otherEventName: string;
    /** The event's name when it was sent (the language of the page they used). */
    eventTitle: string;
    rating: 1 | 2 | 3 | 4 | 5 | null;
    text: string;
    photos: SubmissionFile[];
    /** The Memory the member turned it into, when they did. */
    memoryId: string | null;
    locale: 'mk' | 'en';
    createdAt: string;
  };

export type IdeaInput = Pick<Idea, 'typeId' | 'title' | 'description' | 'locale'> & {
  sender: Pick<Sender, 'name' | 'email' | 'userId' | 'isAnonymous'>;
  attachment: SubmissionFile | null;
};

export type FeedbackInput = Pick<
  Feedback,
  'eventId' | 'otherEventName' | 'eventTitle' | 'rating' | 'text' | 'locale'
> & {
  sender: Pick<Sender, 'name' | 'email' | 'userId' | 'isAnonymous'>;
  photos: SubmissionFile[];
  memoryId: string | null;
};

export type SubmissionCounts = Record<SubmissionStatus | 'all', number>;

export type IdeasQuery = {
  status?: SubmissionStatus;
  typeId?: string;
  q?: string;
  page: number;
  pageSize: number;
};

export type FeedbackQuery = {
  status?: SubmissionStatus;
  /** A listed event's id, or `other:<name>`. */
  eventKey?: string;
  q?: string;
  /** Event managers: only feedback of these events (D18). */
  onlyEventIds?: readonly string[];
  page: number;
  pageSize: number;
};

/** One row of Ratings per event: computed from the rated feedback. */
export type EventRating = {
  /** The event id, or `other:<name>`. */
  key: string;
  eventId: string | null;
  eventTitle: string;
  average: number;
  count: number;
  /** How many gave 1, 2, 3, 4 and 5 stars. */
  distribution: [number, number, number, number, number];
  latestComment: { text: string; createdAt: string } | null;
  latestAt: string;
};

export type RatingsQuery = {
  /** Only feedback sent in this period (ISO, [from, until)). */
  from?: string;
  until?: string;
  onlyEventIds?: readonly string[];
};

/** What Admin › Ideas › Form settings edits (the board notification switch lives in Settings). */
export type IdeaFormSettings = {
  /** The two texts under the page title of each tab. */
  intro: { idea: Localized; impression: Localized };
  types: IdeaType[];
};

export const IDEA_INTRO_KEYS = ['idea', 'impression'] as const;

export const IDEA_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
