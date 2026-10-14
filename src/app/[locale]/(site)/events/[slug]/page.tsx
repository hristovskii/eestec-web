import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EventDetail, eventJsonLd } from '@/features/events';
import { getArchiveSlugs, getEventPage } from '@/features/events/server';
import { getSiteSettings, socialMetadata } from '@/features/settings/server';
import { isEnabled } from '@/shared/config/flags';
import { SITE_URL } from '@/shared/config/site';
import { currentLocale } from '@/shared/i18n/current-locale';
import { redirect } from '@/shared/i18n/navigation';
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
  return {
    title: seo.title,
    // The board's SEO description, else the short description of the event card.
    // Neither written: the site's default description (from the layout) applies.
    description: seo.description || page.event.shortDescription.text || undefined,
    ...(await socialMetadata(`/${timing === 'upcoming' ? 'upcoming' : 'events'}/${slug}`, locale, {
      image: shareImage,
    })),
  };
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
      />
    </>
  );
}
