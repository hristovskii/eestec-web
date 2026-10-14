import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getMediaMap, resolveMediaRef } from '@/features/media/server';
import { isEnabled } from '@/shared/config/flags';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';

import { journeyTags } from './cache-tags';
import { journeyRepository } from './data';
import { publicButton } from './domain/phase';
import type { JourneyRecord, PublicJourney } from './types';

/** The Media library files the Journey content uses. */
export const journeyMediaIds = (journey: JourneyRecord) =>
  journey.steps.flatMap((step) => (step.photo ? [step.photo.mediaId] : []));

/**
 * The Journey content in the language of the page (the page and the Home teaser). Cached; every
 * admin change refreshes it. Buttons to member pages are left out until Phase 2 is on.
 */
export async function getJourney(locale: Locale): Promise<PublicJourney> {
  'use cache';
  cacheTag(journeyTags.all);
  cacheLife('hours');
  const journey = await (await journeyRepository()).get();
  const files = await getMediaMap(journeyMediaIds(journey));
  const phase2 = isEnabled('phase2');
  const text = (value: { mk: string; en?: string }) => resolveLocalized(value, locale);
  const button = (value: { label: { mk: string; en?: string }; href: string }) =>
    publicButton({ label: text(value.label), href: value.href }, phase2);
  return {
    hero: {
      eyebrow: text(journey.hero.eyebrow),
      title: text(journey.hero.title),
      lead: text(journey.hero.lead),
    },
    steps: journey.steps.map((step, index) => ({
      id: step.id,
      n: index + 1,
      icon: step.icon,
      title: text(step.title),
      text: text(step.text),
      button: button(step.button),
      bullets: step.bullets.map((bullet) => text(bullet.text)).filter(Boolean),
      photo: resolveMediaRef(step.photo, files, locale),
      quote: step.quote ? { text: text(step.quote.text), author: text(step.quote.author) } : null,
    })),
    cta: { title: text(journey.cta.title), text: text(journey.cta.text), button: button(journey.cta.button) },
  };
}

/** Admin › Pages › Journey: everything in both languages and the library files it uses; never cached. Callers check the permission. */
export async function getJourneyForEdit() {
  const journey = await (await journeyRepository('session')).get();
  const media = await getMediaMap(journeyMediaIds(journey));
  return { journey, media: Object.fromEntries(media) };
}
