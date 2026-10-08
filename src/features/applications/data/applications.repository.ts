import type { Paged } from '@/shared/data/paged';

import type {
  Application,
  ApplicationFile,
  ApplicationForm,
  ApplicationInput,
  ApplicationRow,
  ApplicationsQuery,
  ApplicationStatus,
  ApplicationsSummary,
  Availability,
  StatusCounts,
  StoredUpload,
} from '../types';

export type SubmitResult =
  | { status: 'created'; application: Application }
  /** Every place is taken and the event has no waitlist (D11). */
  | { status: 'full' }
  /** This e-mail already applied to this event. */
  | { status: 'duplicate' };

/** A private upload as it arrives from the form (CVs; never public, data-model.md). */
export type UploadInput = { name: string; type: string; bytes: Uint8Array };

/**
 * Applications to events (data-model.md: application_forms, applications). The public side reads
 * forms and places and sends applications; the admin side lists, opens and moves them between
 * statuses. Permissions are checked by the callers (event managers: their events only, D18).
 */
export interface ApplicationsRepository {
  /** The event's own form; null: it uses the default fields. */
  getForm(eventId: string): Promise<ApplicationForm | null>;
  /** Form builder: replaces the event's form (applications already sent keep their answers). */
  saveForm(form: ApplicationForm): Promise<ApplicationForm>;
  /** Form builder: back to the default questions. */
  deleteForm(eventId: string): Promise<void>;
  /** Per question key: how many applications answered it (the builder warns before removing). */
  answerCounts(eventId: string): Promise<Record<string, number>>;
  /** Accepted and waitlisted applications per event (events without any are left out). */
  availability(eventIds: readonly string[]): Promise<Record<string, Availability>>;
  /**
   * Saves an application with the next reference, in one step (a transaction in Supabase), so two
   * people can't take the last place:
   * - selection: pending while places are free; afterwards the waitlist (or refused without one);
   * - first come: accepted while places are free and nobody is waiting; otherwise the waitlist.
   */
  submit(input: ApplicationInput, now: Date): Promise<SubmitResult>;
  /** Stores an uploaded file in the private bucket. */
  storeFile(upload: UploadInput, now: Date): Promise<ApplicationFile>;

  /** One event's list: filtered, sorted, paged, with the tab counts. */
  list(query: ApplicationsQuery): Promise<Paged<ApplicationRow> & { counts: StatusCounts }>;
  get(id: string): Promise<Application | null>;
  /** Totals, new and per status for these events (events without applications are left out). */
  summaries(eventIds: readonly string[]): Promise<Record<string, ApplicationsSummary>>;
  /**
   * Moves applications of one event to a status. The waitlist keeps its order: new arrivals go to
   * the end, leaving it closes the gap. Returns the ids that changed.
   */
  setStatus(eventId: string, ids: readonly string[], status: ApplicationStatus): Promise<string[]>;
  /** The admin opened it: it is no longer "new". */
  markRead(id: string, now: Date): Promise<void>;
  /** An uploaded file with its content (admin download). */
  getFile(fileId: string): Promise<StoredUpload | null>;
  /** The application a file was sent with (whose event decides who may download it). */
  findByFile(fileId: string): Promise<Application | null>;
}
