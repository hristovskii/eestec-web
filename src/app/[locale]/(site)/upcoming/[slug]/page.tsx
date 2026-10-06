import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { UpcomingEventPage } from '@/features/applications';
import { getUpcomingPage } from '@/features/applications/server';
import { getUpcomingSlugs } from '@/features/events/server';
import { getSiteSettings } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import { redirect } from '@/shared/i18n/navigation';

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

// /upcoming/[slug] (UpcomingDetail): an event that hasn't ended, with its application. Ended
// events and old addresses are 301-redirected by the proxy before rendering (decided rule).
export default async function UpcomingEventRoute({ params }: PageProps<'/[locale]/upcoming/[slug]'>) {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const [page, settings] = await Promise.all([getUpcomingPage(slug, locale), getSiteSettings(locale)]);
  if (!page) notFound();
  if (page.event.timing === 'past') redirect({ href: `/events/${slug}`, locale });
  const instagram = settings.socialLinks.find((link) => link.platform === 'instagram');
  return (
    <UpcomingEventPage
      page={page}
      locale={locale}
      siteName={settings.siteName}
      mainEmail={settings.contact.mainEmail}
      instagram={instagram ? instagram.handle.replace(/^@/, '') : null}
    />
  );
}
