import type { EventOption } from '../types';

/** Events. M5 adds the archive, upcoming list, detail and admin methods. */
export interface EventsRepository {
  /** Every event as a choice, newest first (admin forms). */
  listOptions(): Promise<EventOption[]>;
}
