import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { EventPageModel, UpcomingEventCard } from '@/features/events';
import { eventTags, getEventPage, getUpcomingEvents } from '@/features/events/server';
import { getSiteSettings } from '@/features/settings/server';
import { resolveText } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';
import { now } from '@/shared/lib/now';

import { applicationTags } from './cache-tags';
import { applicationsRepository } from './data';
import { applicationState, type ApplyState } from './domain/application-state';
import { DEFAULT_APPLICATION_FIELDS, DEFAULT_FORM_INTRO } from './domain/default-form';
import type { ApplicationForm, PublicApplicationForm } from './types';

// Public reads for /upcoming (docs/ARCHITECTURE.md §4.3): events from the events feature, places
// from here, the state from domain/application-state. Cached and tagged; every application
// refreshes its event (updateTag), and time-based states refresh within 10 minutes (cacheLife).

export type UpcomingItem = UpcomingEventCard & { apply: ApplyState };

export type UpcomingList = {
  items: UpcomingItem[];
  /** Server "now" of this render: countdowns start from it and tick in the browser. */
  now: string;
};

const applySettings = (settings: Awaited<ReturnType<typeof getSiteSettings>>) => ({
  deadlineSoonHours: settings.events.deadlineSoonHours,
  autoCloseApplications: settings.events.autoCloseApplications,
});

export async function getUpcomingList(locale: Locale): Promise<UpcomingList> {
  'use cache';
  cacheTag(eventTags.list, applicationTags.all);
  cacheLife('events');
  const [events, settings, repo] = await Promise.all([
    getUpcomingEvents(locale),
    getSiteSettings(locale),
    applicationsRepository(),
  ]);
  const places = await repo.availability(events.map((event) => event.id));
  const at = now();
  return {
    items: events.map((event) => ({
      ...event,
      apply: applicationState(event, at, applySettings(settings), places[event.id] ?? null),
    })),
    now: at.toISOString(),
  };
}

/** A form in one language (EN falls back to MK per text). */
export function resolveForm(
  form: Pick<ApplicationForm, 'intro' | 'fields'>,
  locale: Locale,
): PublicApplicationForm {
  const text = (value: { mk: string; en?: string }) => resolveText(value, locale).text;
  return {
    intro: text(form.intro),
    fields: form.fields.map(({ options, ...field }) => ({
      ...field,
      label: text(field.label),
      help: text(field.help),
      placeholder: text(field.placeholder),
      ...(options
        ? { options: options.map((option) => ({ value: option.value, label: text(option.label) })) }
        : {}),
    })),
  };
}

export type UpcomingPage = {
  event: EventPageModel;
  apply: ApplyState;
  /** The internal form, when the event uses one (also while it is closed: null then). */
  form: PublicApplicationForm | null;
  now: string;
};

/** /upcoming/[slug]: the event, its application state and form. null = 404. */
export async function getUpcomingPage(slug: string, locale: Locale): Promise<UpcomingPage | null> {
  'use cache';
  cacheTag(eventTags.list, eventTags.detail(slug), applicationTags.all);
  cacheLife('events');
  const [page, settings, repo] = await Promise.all([
    getEventPage(slug, locale),
    getSiteSettings(locale),
    applicationsRepository(),
  ]);
  if (!page) return null;
  const { event } = page;
  cacheTag(applicationTags.event(event.id));
  const [places, form] = await Promise.all([repo.availability([event.id]), repo.getForm(event.id)]);
  const at = now();
  const apply = applicationState(event, at, applySettings(settings), places[event.id] ?? null);
  return {
    event,
    apply,
    form: apply.canApply
      ? resolveForm(form ?? { intro: DEFAULT_FORM_INTRO, fields: DEFAULT_APPLICATION_FIELDS }, locale)
      : null,
    now: at.toISOString(),
  };
}
