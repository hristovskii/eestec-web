import type { Paged } from '@/shared/data/paged';

import type {
  EventRating,
  Feedback,
  FeedbackInput,
  FeedbackQuery,
  Idea,
  IdeaInput,
  IdeasQuery,
  RatingsQuery,
  SubmissionCounts,
  SubmissionFile,
  SubmissionStatus,
} from '../types';

/** What the board does with a submission (data-model.md: ideas, feedback). */
export type SubmissionPatch = {
  status?: SubmissionStatus;
  /** `null` takes the owner away. */
  owner?: { id: string; name: string } | null;
};

/** A file as it arrives from the form: the caller has checked its real type. */
export type SubmissionBlob = { bytes: Uint8Array; mimeType: string; name: string };

/**
 * Ideas and feedback from /submit, and the board's handling of them (Admin › Ideas & Feedback).
 * Submitting and storing files are the server's work (service scope on a database); the rest is the board's.
 */
export interface SubmissionsRepository {
  /** Stores a file of a submission in the private store and returns what the submit refers to. */
  storeFile(blob: SubmissionBlob): Promise<SubmissionFile>;
  /** The file with its content, for the board's download; null when there is none or this person may not open it. */
  readFile(fileId: string): Promise<SubmissionBlob | null>;

  /**
   * Stores an idea as "new". Anonymous ideas keep no name, no e-mail and no account, whatever
   * the input says; an e-mail without a name is kept as it is (consent recorded at `now`).
   * A named sender with an account must be that account's person (a database checks the verified e-mail).
   */
  submitIdea(input: IdeaInput, now: Date): Promise<Idea>;
  /** Stores feedback as "new", and the Memory that comes with it (`input.memory`) in the same step. */
  submitFeedback(input: FeedbackInput, now: Date): Promise<Feedback>;

  /** Newest first. */
  listIdeas(query: IdeasQuery): Promise<Paged<Idea>>;
  ideaCounts(): Promise<SubmissionCounts>;
  getIdea(id: string): Promise<Idea | null>;
  updateIdea(id: string, patch: SubmissionPatch): Promise<Idea | null>;
  /**
   * The events of accepted ideas, newest idea first, and nothing else about them (for the public page "Ideas that became
   * events"; a visitor may call it). The caller shows only the events that are published.
   */
  acceptedEventIds(limit: number): Promise<string[]>;
  /** Remembers the event draft made from an accepted idea. */
  linkEventDraft(id: string, eventDraftId: string): Promise<Idea | null>;
  /** Whose file this is (the download checks who may open it); null: no submission has it. */
  fileOwner(fileId: string): Promise<{ kind: 'idea' } | { kind: 'feedback'; eventId: string | null } | null>;
  /** How many ideas use this type (a type in use cannot be removed). */
  countIdeasOfType(typeId: string): Promise<number>;

  /**
   * With `onlyEventIds` (an event manager, D33) the rows carry the rating and the impression and nothing of the
   * sender, the owner, the photos or the Memory.
   */
  listFeedback(query: FeedbackQuery): Promise<Paged<Feedback>>;
  feedbackCounts(onlyEventIds?: readonly string[]): Promise<SubmissionCounts>;
  getFeedback(id: string): Promise<Feedback | null>;
  updateFeedback(id: string, patch: SubmissionPatch): Promise<Feedback | null>;
  /** The events that have feedback: for the filter ("All events"), newest feedback first. */
  feedbackEvents(onlyEventIds?: readonly string[]): Promise<{ key: string; title: string }[]>;

  /** Average, spread and the latest comment of each event with rated feedback, newest feedback first. */
  ratings(query: RatingsQuery): Promise<EventRating[]>;

  /** Every idea / feedback (no paging): the CSV export. */
  allIdeas(): Promise<Idea[]>;
  allFeedback(onlyEventIds?: readonly string[]): Promise<Feedback[]>;
}
