import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { UpcomingEventPage } from '@/features/applications';
import { getUpcomingPage } from '@/features/applications/server';
import { eventJsonLd } from '@/features/events';
import { getUpcomingSlugs } from '@/features/events/server';
import { getSiteSettings, socialMetadata } from '@/features/settings/server';
import { SITE_URL } from '@/shared/config/site';
import { currentLocale } from '@/shared/i18n/current-locale';
import { redirect } from '@/shared/i18n/navigation';
import { localizedPath } from '@/shared/seo/alternates';
import { JsonLdScript } from '@/shared/seo/json-ld-script';

// Every listed upcoming event is prerendered; new ones render on first visit. At least one param
// is required under Cache Components, hence the placeholder (it 404s).
export async function generateStaticParams() {
  const slugs = await getUpcomingSlugs();
  return slugs.length > 0 ? slugs.map((slug) => ({ slug })) : [{ slug: '__none__' }];
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/upcoming/[slug]'>): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const page = await getUpcomingPage(slug, locale);
  if (!page) return {};
  const { seo, shareImage, timing } = page.event;
  return {
    title: seo.title,
    description: seo.description,
    ...(await socialMetadata(`/${timing === 'past' ? 'events' : 'upcoming'}/${slug}`, locale, {
      image: shareImage,
    })),
  };
}

// /upcoming/[slug] (UpcomingDetail): an event that hasn't ended, with its application. Ended
// events and old addresses are 301-redirected by the proxy before rendering (decided rule).
export default async function UpcomingEventRoute({ params }: PageProps<'/[locale]/upcoming/[slug]'>) {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const [page, settings] = await Promise.all([getUpcomingPage(slug, locale), getSiteSettings(locale)]);
  if (!page) notFound();
  if (page.event.timing === 'past') redirect({ href: `/events/${slug}`, locale });
  const instagram = settings.socialLinks.find((link) => link.platform === 'instagram');
  return (
    <>
      <JsonLdScript
        data={eventJsonLd(page.event, {
          origin: SITE_URL.origin,
          path: localizedPath(`/upcoming/${slug}`, locale),
          siteName: settings.siteName,
          description: page.event.shortDescription.text,
        })}
      />
      <UpcomingEventPage
        page={page}
        locale={locale}
        siteName={settings.siteName}
        mainEmail={settings.contact.mainEmail}
        instagram={instagram ? instagram.handle.replace(/^@/, '') : null}
      />
    </>
  );
}
