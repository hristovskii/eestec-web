import { zonedToIso } from '@/shared/lib/zoned-time';

import type { EventDraftInput } from '../schemas/event.schema';

const empty = { mk: '' };

/** The day after `now` in Skopje, as YYYY-MM-DD. */
function tomorrow(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Skopje' }).format(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
  );
}

/**
 * A new event: a draft for tomorrow 10:00–18:00 (dates are required even for drafts, so the form
 * starts with a valid pair), with the application defaults from Settings › Events.
 */
export function newEventInput(
  now: Date,
  defaults: { typeId: string; maxParticipants: number; waitlist: boolean },
): EventDraftInput {
  const day = tomorrow(now);
  return {
    slug: '',
    title: { ...empty },
    shortDescription: { ...empty },
    scope: 'local',
    typeId: defaults.typeId,
    topicIds: [],
    startsAt: zonedToIso(day, '10:00')!,
    endsAt: zonedToIso(day, '18:00')!,
    allDay: false,
    location: { ...empty },
    city: { ...empty },
    country: { ...empty },
    organizer: null,
    description: { ...empty },
    agenda: [],
    requirements: { ...empty },
    fee: { price: { ...empty }, note: { ...empty } },
    contactEmail: '',
    participantCount: null,
    countryCount: null,
    cover: null,
    gallery: [],
    infoPackId: null,
    videoUrl: '',
    status: 'draft',
    publishAt: null,
    nextUp: false,
    applications: {
      enabled: false,
      via: 'form',
      externalUrl: '',
      opensAt: null,
      deadline: null,
      resultsOn: null,
      maxParticipants: defaults.maxParticipants,
      waitlist: defaults.waitlist,
    },
    seo: { title: { ...empty }, description: { ...empty }, shareImageId: null },
  };
}
