import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { resolveLocalized } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';

import { contactTags } from './cache-tags';
import { contactRepository, messagesRepository } from './data';
import { CONTACT_HEADINGS, type PublicContact } from './types';

/** The Contact page in the language of the page. Cached; every admin change refreshes it. */
export async function getContact(locale: Locale): Promise<PublicContact> {
  'use cache';
  cacheTag(contactTags.all);
  cacheLife('hours');
  const contact = await (await contactRepository()).get();
  const text = (value: { mk: string; en?: string }) => resolveLocalized(value, locale);
  return {
    hero: { title: text(contact.hero.title), lead: text(contact.hero.lead) },
    shortcuts: contact.shortcuts.map((card) => ({
      id: card.id,
      eyebrow: text(card.eyebrow),
      label: text(card.label),
      href: card.href,
    })),
    headings: Object.fromEntries(
      CONTACT_HEADINGS.map((key) => [key, text(contact.headings[key])]),
    ) as PublicContact['headings'],
    form: { title: text(contact.form.title), intro: text(contact.form.intro) },
    subjects: contact.subjects.map((subject) => {
      const note = text(subject.routeNote);
      const label = text(subject.shortcutLabel);
      return {
        id: subject.id,
        name: text(subject.name),
        teamLabel: text(subject.teamLabel),
        suggestion: note ? { note, label, href: subject.shortcutUrl } : null,
      };
    }),
    map: {
      pinLabel: text(contact.map.pinLabel),
      placeName: text(contact.map.placeName),
      placeAddress: text(contact.map.placeAddress),
      lat: contact.map.lat,
      lng: contact.map.lng,
      zoom: contact.map.zoom,
    },
  };
}

/** Admin › Pages › Contact: everything in both languages; never cached. Callers check the permission. */
export async function getContactForEdit() {
  return { contact: await (await contactRepository('session')).get() };
}

/** Messages nobody has answered yet (status "new"): the count on the Inbox tab, the sidebar and the dashboard. */
export async function countNewMessages(): Promise<number> {
  return (await (await messagesRepository('session')).list({ status: 'new' })).length;
}
