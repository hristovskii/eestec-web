import 'server-only';

import { eventsRepository } from './data';

/** Every event as a choice (admin forms: "Events they manage"). */
export async function listEventOptions() {
  return (await eventsRepository()).listOptions();
}
