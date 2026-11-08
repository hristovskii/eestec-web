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
  SubmissionStatus,
} from '../types';

/** What the board does with a submission (data-model.md: ideas, feedback). */
export type SubmissionPatch = {
  status?: SubmissionStatus;
  /** `null` takes the owner away. */
  owner?: { id: string; name: string } | null;
};

/** Ideas and feedback from /submit, and the board's handling of them (Admin › Ideas & Feedback). */
export interface SubmissionsRepository {
  /**
   * Stores an idea as "new". Anonymous ideas keep no name, no e-mail and no account, whatever
   * the input says; an e-mail without a name is kept as it is (consent recorded at `now`).
   */
  submitIdea(input: IdeaInput, now: Date): Promise<Idea>;
  submitFeedback(input: FeedbackInput, now: Date): Promise<Feedback>;

  /** Newest first. */
  listIdeas(query: IdeasQuery): Promise<Paged<Idea>>;
  ideaCounts(): Promise<SubmissionCounts>;
  getIdea(id: string): Promise<Idea | null>;
  updateIdea(id: string, patch: SubmissionPatch): Promise<Idea | null>;
  /** Remembers the event draft made from an accepted idea. */
  linkEventDraft(id: string, eventDraftId: string): Promise<Idea | null>;
  /** Whose file this is (the download checks who may open it); null: no submission has it. */
  fileOwner(fileId: string): Promise<{ kind: 'idea' } | { kind: 'feedback'; eventId: string | null } | null>;
  /** How many ideas use this type (a type in use cannot be removed). */
  countIdeasOfType(typeId: string): Promise<number>;

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
