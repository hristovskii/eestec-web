import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getMediaMap } from '@/features/media/server';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';
import { now } from '@/shared/lib/now';
import { isoToZoned } from '@/shared/lib/zoned-time';

import { partnersTags } from './cache-tags';
import { partnersRepository } from './data';
import { pastYears, sponsorStatus } from './domain/sponsor-status';
import { groupByTier } from './domain/tiers';
import type { PartnersPageRecord, PublicPartnersPage, PublicSponsor, Sponsor } from './types';

/** The library files the page uses: the logos and the offer PDF. */
export const partnersMediaIds = (page: PartnersPageRecord, sponsors: Sponsor[]) => [
  ...(page.offer.mediaId ? [page.offer.mediaId] : []),
  ...sponsors.flatMap((sponsor) => (sponsor.logo ? [sponsor.logo.mediaId] : [])),
];

/** For Companies and the Home partner strip in the language of the page. Cached; every admin change refreshes it. */
export async function getPartners(locale: Locale): Promise<PublicPartnersPage> {
  'use cache';
  cacheTag(partnersTags.all);
  cacheLife('hours');
  const repo = await partnersRepository();
  const [page, tiers, sponsors] = await Promise.all([repo.getPage(), repo.listTiers(), repo.listSponsors()]);
  const files = await getMediaMap(partnersMediaIds(page, sponsors));
  const text = (value: { mk: string; en?: string }) => resolveLocalized(value, locale);
  const today = isoToZoned(now().toISOString()).date;

  const publicSponsor = (sponsor: Sponsor, years?: string): PublicSponsor => {
    const file = sponsor.logo ? files.get(sponsor.logo.mediaId) : undefined;
    // A library item without a file (a SAMPLE) is shown by name, like a sponsor without a logo.
    const logo =
      sponsor.logo && file?.kind === 'image' && file.src
        ? {
            src: file.src,
            alt: resolveLocalized(sponsor.logo.alt, locale),
            width: file.width ?? 0,
            height: file.height ?? 0,
          }
        : null;
    return { id: sponsor.id, name: sponsor.name, url: sponsor.websiteUrl, logo, ...(years ? { years } : {}) };
  };

  const active = sponsors.filter((sponsor) => sponsorStatus(sponsor, today) === 'active');
  const past = sponsors.filter((sponsor) => sponsorStatus(sponsor, today) === 'past');
  const offerFile = page.offer.mediaId ? files.get(page.offer.mediaId) : undefined;

  return {
    hero: {
      eyebrow: text(page.hero.eyebrow),
      title: text(page.hero.title),
      lead: text(page.hero.lead),
      primaryLabel: text(page.hero.primaryLabel),
      offerLabel: text(page.hero.offerLabel),
    },
    reach: {
      title: text(page.reach.title),
      stats: page.reach.stats.map((stat) => ({
        id: stat.id,
        value: text(stat.value),
        label: text(stat.label),
      })),
    },
    why: {
      eyebrow: text(page.why.eyebrow),
      title: text(page.why.title),
      cards: page.why.cards.map((card) => ({
        id: card.id,
        icon: card.icon,
        title: text(card.title),
        text: text(card.text),
      })),
    },
    packages: {
      eyebrow: text(page.packages.eyebrow),
      title: text(page.packages.title),
      note: text(page.packages.note),
      badge: text(page.packages.badge),
      items: page.packages.items.map((item) => ({
        id: item.id,
        name: text(item.name),
        text: text(item.text),
        priceText: text(item.priceText),
        items: item.items.map((line) => text(line.text)).filter(Boolean),
        highlighted: item.highlighted,
        cta: text(item.cta),
      })),
      singlesTitle: text(page.packages.singlesTitle),
      singles: page.packages.singles.map((card) => ({
        id: card.id,
        icon: card.icon,
        title: text(card.title),
        text: text(card.text),
      })),
    },
    offer:
      offerFile?.kind === 'document'
        ? {
            title: text(page.offer.title),
            text: text(page.offer.text),
            pages: text(page.offer.pages),
            downloadLabel: text(page.offer.downloadLabel),
            file: offerFile.src ? { src: offerFile.src } : null,
            size: offerFile.size,
          }
        : null,
    partners: {
      eyebrow: text(page.partners.eyebrow),
      title: text(page.partners.title),
      pastTitle: text(page.partners.pastTitle),
    },
    contact: {
      eyebrow: text(page.contact.eyebrow),
      title: text(page.contact.title),
      text: text(page.contact.text),
      person: {
        name: page.contact.person.name,
        role: text(page.contact.person.role),
        email: page.contact.person.email,
      },
    },
    tiers: groupByTier(tiers, active).map(({ tier, sponsors: inTier }) => ({
      id: tier.id,
      name: text(tier.name),
      size: tier.size,
      sponsors: inTier.map((sponsor) => publicSponsor(sponsor)),
    })),
    past: past.map((sponsor) => publicSponsor(sponsor, pastYears(sponsor))),
  };
}

/** Admin › Pages › Sponsors: everything in both languages and the library files it uses; never cached. Callers check the permission. */
export async function getPartnersForEdit() {
  const repo = await partnersRepository('session');
  const [page, tiers, sponsors] = await Promise.all([repo.getPage(), repo.listTiers(), repo.listSponsors()]);
  const media = await getMediaMap(partnersMediaIds(page, sponsors));
  return {
    page,
    tiers,
    sponsors,
    media: Object.fromEntries(media),
    today: isoToZoned(now().toISOString()).date,
  };
}
