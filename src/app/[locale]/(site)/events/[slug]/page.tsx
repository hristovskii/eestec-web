import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { EventDetail, eventJsonLd } from '@/features/events';
import { getArchiveSlugs, getEventPage } from '@/features/events/server';
import { MemoriesRow } from '@/features/memories/public';
import { getMemoriesOfEvent } from '@/features/memories/server';
import { getAuthorCards } from '@/features/members/server';
import { getSiteSettings, socialMetadata } from '@/features/settings/server';
import { isEnabled } from '@/shared/config/flags';
import { SITE_URL } from '@/shared/config/site';
import { currentLocale } from '@/shared/i18n/current-locale';
import { redirect } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import { Container } from '@/shared/ui/container';
import { localizedPath } from '@/shared/seo/alternates';
import { JsonLdScript } from '@/shared/seo/json-ld-script';

// Every past event is prerendered; new and renamed ones render on first visit. At least one
// param is required under Cache Components, hence the placeholder (it 404s).
export async function generateStaticParams() {
  const slugs = await getArchiveSlugs();
  return slugs.length > 0 ? slugs.map((slug) => ({ slug })) : [{ slug: '__none__' }];
}

export async function generateMetadata({ params }: PageProps<'/[locale]/events/[slug]'>): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const page = await getEventPage(slug, locale);
  if (!page) return {};
  const { seo, shareImage, timing } = page.event;
  const description = seo.description || page.event.shortDescription.text;
  return {
    title: seo.title,
    // The board's SEO description, else the short description of the event card. Neither written:
    // the key is left out, so the site's default description (from the layout) applies.
    ...(description ? { description } : {}),
    ...(await socialMetadata(`/${timing === 'upcoming' ? 'upcoming' : 'events'}/${slug}`, locale, {
      image: shareImage,
    })),
  };
}

// "Memories from this event" (Phase 2): the cards are cached; their authors depend on who is looking,
// so this streams in behind the page. Nothing is drawn when nobody wrote about the event.
async function EventMemories({ eventId, slug, locale }: { eventId: string; slug: string; locale: Locale }) {
  const [t, { items, total }] = await Promise.all([
    getTranslations('memories.eventRow'),
    getMemoriesOfEvent(eventId, locale, { limit: 3 }),
  ]);
  if (items.length === 0) return null;
  const authors = await getAuthorCards(
    'visitor',
    locale,
    items.flatMap((memory) => (memory.authorId ? [memory.authorId] : [])),
  );
  return (
    <div className="bg-surface">
      <Container className="py-10 lg:py-14">
        <MemoriesRow
          id="event-memories"
          headingLevel="h2"
          title={t('title')}
          cards={items}
          authors={authors}
          locale={locale}
          link={
            total > items.length
              ? { href: `/memories?event=${slug}`, label: t('all', { count: total }) }
              : undefined
          }
        />
      </Container>
    </div>
  );
}

// /events/[slug] (EventDetail): past events. Old addresses are 301-redirected by the proxy;
// events that haven't ended live at /upcoming/[slug] (M7).
export default async function EventPage({ params }: PageProps<'/[locale]/events/[slug]'>) {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const [page, settings] = await Promise.all([getEventPage(slug, locale), getSiteSettings(locale)]);
  if (!page) notFound();
  if (page.event.timing === 'upcoming') redirect({ href: `/upcoming/${slug}`, locale });
  return (
    <>
      <JsonLdScript
        data={eventJsonLd(page.event, {
          origin: SITE_URL.origin,
          path: localizedPath(`/events/${slug}`, locale),
          siteName: settings.siteName,
          description: page.event.shortDescription.text,
        })}
      />
      <EventDetail
        event={page.event}
        prev={page.prev}
        next={page.next}
        locale={locale}
        phase2={isEnabled('phase2')}
        memories={
          isEnabled('phase2') ? (
            <Suspense fallback={null}>
              <EventMemories eventId={page.event.id} slug={slug} locale={locale} />
            </Suspense>
          ) : undefined
        }
      />
    </>
  );
}
