import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EventDetail } from '@/features/events';
import { getArchiveSlugs, getEventPage } from '@/features/events/server';
import { isEnabled } from '@/shared/config/flags';
import { currentLocale } from '@/shared/i18n/current-locale';
import { redirect } from '@/shared/i18n/navigation';

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
  const { seo, shareImage } = page.event;
  return {
    title: seo.title,
    description: seo.description,
    ...(shareImage
      ? {
          openGraph: {
            images: [
              {
                url: shareImage.src,
                width: shareImage.width,
                height: shareImage.height,
                alt: shareImage.alt,
              },
            ],
          },
        }
      : {}),
  };
}

// /events/[slug] (EventDetail): past events. Old addresses are 301-redirected by the proxy;
// events that haven't ended live at /upcoming/[slug] (M7).
export default async function EventPage({ params }: PageProps<'/[locale]/events/[slug]'>) {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const page = await getEventPage(slug, locale);
  if (!page) notFound();
  if (page.event.timing === 'upcoming') redirect({ href: `/upcoming/${slug}`, locale });
  return (
    <EventDetail
      event={page.event}
      prev={page.prev}
      next={page.next}
      locale={locale}
      phase2={isEnabled('phase2')}
    />
  );
}
