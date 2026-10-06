import type { Application, ApplicationFile, ApplicationForm, ApplicationInput, Availability } from '../types';

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
 * forms and places and sends applications; the admin side (list, statuses, export, form builder)
 * arrives in M7b.
 */
export interface ApplicationsRepository {
  /** The event's own form; null: it uses the default fields. */
  getForm(eventId: string): Promise<ApplicationForm | null>;
  /** Accepted and waitlisted applications per event (events without any are left out). */
  availability(eventIds: readonly string[]): Promise<Record<string, Availability>>;
  /**
   * Saves an application with the next reference. When the accepted applications already fill the
   * places it joins the waitlist (with a position), or is refused without a waitlist. One step, so
   * two people can't take the last place (a transaction in Supabase).
   */
  submit(input: ApplicationInput, now: Date): Promise<SubmitResult>;
  /** Stores an uploaded file in the private bucket. */
  storeFile(upload: UploadInput, now: Date): Promise<ApplicationFile>;
}
