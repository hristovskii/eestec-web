import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getMediaMap } from '@/features/media/server';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';

import { joinTags } from './cache-tags';
import { joinRepository, membershipRepository } from './data';
import type { JoinRecord, PublicJoin } from './types';

/** The Media library files the Join page uses (the PDFs). */
export const joinMediaIds = (join: JoinRecord) => join.documents.map((document) => document.mediaId);

/** The Join page in the language of the page. Cached; every admin change refreshes it. */
export async function getJoin(locale: Locale): Promise<PublicJoin> {
  'use cache';
  cacheTag(joinTags.all);
  cacheLife('hours');
  const join = await (await joinRepository()).get();
  const files = await getMediaMap(joinMediaIds(join));
  const text = (value: { mk: string; en?: string }) => resolveLocalized(value, locale);
  const lines = (items: JoinRecord['eligibility']['items']) =>
    items.map((item) => text(item.text)).filter(Boolean);
  const options = (items: JoinRecord['apply']['faculties']) =>
    items.map((item) => ({ value: item.id, label: text(item.text) })).filter((item) => item.label);
  const feeAmount = text(join.fee.amount);
  return {
    hero: { eyebrow: text(join.hero.eyebrow), title: text(join.hero.title), lead: text(join.hero.lead) },
    headings: {
      why: text(join.headings.why),
      who: text(join.headings.who),
      how: text(join.headings.how),
      rules: text(join.headings.rules),
      faq: text(join.headings.faq),
      apply: text(join.headings.apply),
    },
    glance: join.glance.map((item) => ({
      id: item.id,
      icon: item.icon,
      label: text(item.label),
      value: text(item.value),
    })),
    benefits: join.benefits.map((card) => ({
      id: card.id,
      icon: card.icon,
      title: text(card.title),
      text: text(card.text),
    })),
    eligibility: {
      items: lines(join.eligibility.items),
      noteTitle: text(join.eligibility.noteTitle),
      noteText: text(join.eligibility.noteText),
    },
    steps: join.steps.map((step) => ({ id: step.id, title: text(step.title), text: text(step.text) })),
    fee: feeAmount ? { amount: feeAmount, per: text(join.fee.per), note: text(join.fee.note) } : null,
    rules: {
      intro: text(join.rules.intro),
      rights: lines(join.rules.rights),
      duties: lines(join.rules.duties),
      conduct: join.rules.conduct.map((card) => ({
        id: card.id,
        icon: card.icon,
        title: text(card.title),
        text: text(card.text),
      })),
      international: {
        before: lines(join.rules.international.before),
        during: lines(join.rules.international.during),
        after: lines(join.rules.international.after),
      },
    },
    documents: join.documents.flatMap((document) => {
      const file = files.get(document.mediaId);
      if (!file || file.kind !== 'document') return [];
      return [
        {
          id: document.id,
          title: text(document.title),
          file: file.src ? { src: file.src, size: file.size, updatedAt: file.uploadedAt } : null,
          size: file.size,
          updatedAt: file.uploadedAt,
        },
      ];
    }),
    faq: join.faq.map((item) => ({ id: item.id, question: text(item.question), answer: text(item.answer) })),
    apply: {
      open: join.apply.open,
      nextRound: text(join.apply.nextRound),
      intro: text(join.apply.intro),
      faculties: options(join.apply.faculties),
      interests: options(join.apply.interests),
      heardFrom: options(join.apply.heardFrom),
    },
  };
}

/** Admin › Pages › Join Us: everything in both languages and the library files it uses; never cached. Callers check the permission. */
export async function getJoinForEdit() {
  const join = await (await joinRepository('session')).get();
  const media = await getMediaMap(joinMediaIds(join));
  return { join, media: Object.fromEntries(media) };
}

/** Applications nobody has handled yet (status "new"): the count on the Inbox tab, the sidebar and the dashboard. */
export async function countNewApplications(): Promise<number> {
  return (await (await membershipRepository('session')).list({ status: 'new' })).length;
}
