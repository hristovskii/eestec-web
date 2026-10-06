import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { UpcomingList, UpcomingListSkeleton, upcomingParamsSchema } from '@/features/applications';
import { getUpcomingList } from '@/features/applications/server';
import { getSiteSettings, pageMetadata } from '@/features/settings/server';
import { isEnabled } from '@/shared/config/flags';
import { currentLocale } from '@/shared/i18n/current-locale';
import { Link } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import { PageHeader } from '@/shared/layout/site/page-header';
import { Container } from '@/shared/ui/container';
import { Button } from '@/shared/ui/primitives/button';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const t = await getTranslations('upcoming');
  return pageMetadata('upcoming', locale, t('title'));
}

async function List({
  searchParams,
  locale,
}: {
  searchParams: PageProps<'/[locale]/upcoming'>['searchParams'];
  locale: Locale;
}) {
  const { scope } = upcomingParamsSchema.parse(await searchParams);
  const [list, settings] = await Promise.all([getUpcomingList(locale), getSiteSettings(locale)]);
  const instagram = settings.socialLinks.find((link) => link.platform === 'instagram');
  return (
    <UpcomingList
      list={list}
      scope={scope}
      locale={locale}
      phase2={isEnabled('phase2')}
      instagram={instagram ? { handle: instagram.handle.replace(/^@/, ''), url: instagram.url } : null}
      meeting={settings.weeklyMeeting}
    />
  );
}

// /upcoming (UpcomingList): events that haven't ended, soonest first. The header is prerendered;
// the list reads ?scope= and streams in behind the loading state.
export default async function UpcomingPage({ searchParams }: PageProps<'/[locale]/upcoming'>) {
  const locale = await currentLocale();
  const [t, tNav] = await Promise.all([getTranslations('upcoming'), getTranslations('nav')]);
  return (
    <>
      <PageHeader
        title={t('title')}
        breadcrumbs={[{ label: tNav('home'), href: '/' }, { label: t('title') }]}
        lead={
          <>
            <span className="max-sm:hidden">{t('lead')}</span>
            <span className="sm:hidden">{t('leadShort')}</span>
          </>
        }
        actions={
          <Button asChild variant="secondary" className="max-lg:hidden">
            <Link href="/events">
              {t('pastEvents')}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />
      <Container className="pt-5 pb-14 lg:pt-8 lg:pb-24">
        <Suspense fallback={<UpcomingListSkeleton />}>
          <List searchParams={searchParams} locale={locale} />
        </Suspense>
      </Container>
    </>
  );
}
