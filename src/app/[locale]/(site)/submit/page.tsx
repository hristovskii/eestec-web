import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getSession } from '@/features/auth/server';
import { getStartedEvents } from '@/features/events/server';
import { SubmitAside, SubmitForm, SubmitHero, SubmitTabs, submitParamsSchema } from '@/features/ideas/public';
import { getIdeaFormSettings, getIdeasThatBecameEvents } from '@/features/ideas/server';
import { getSiteSettings, pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import { formatDate } from '@/shared/i18n/format';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';
import { Container } from '@/shared/ui/container';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const t = await getTranslations('ideas.page');
  return pageMetadata('submit', locale, t('crumb'));
}

async function Submit({
  searchParams,
  locale,
}: {
  searchParams: PageProps<'/[locale]/submit'>['searchParams'];
  locale: Locale;
}) {
  const params = submitParamsSchema.parse(await searchParams);
  const [session, form, events, settings, became, tDays] = await Promise.all([
    getSession(),
    getIdeaFormSettings(),
    getStartedEvents(locale),
    getSiteSettings(locale),
    getIdeasThatBecameEvents(locale),
    getTranslations({ locale, namespace: 'common.weekdaysPlural' }),
  ]);
  const member = session?.memberStatus
    ? {
        name: session.name,
        email: session.email,
        initials: session.initials,
        canWriteMemory: session.memberStatus === 'active' || session.memberStatus === 'alumni',
      }
    : null;
  const { weeklyMeeting } = settings;
  const preset = params.event ? events.find((event) => event.slug === params.event) : undefined;
  return (
    <Container className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 lg:py-12">
      <div className="flex min-w-0 flex-col gap-6">
        <SubmitTabs tab={params.tab} event={params.event ?? null} />
        <SubmitForm
          key={params.tab}
          tab={params.tab}
          intro={resolveLocalized(form.intro[params.tab], locale)}
          types={form.types.map((type) => ({ id: type.id, name: resolveLocalized(type.name, locale) }))}
          events={events.map((event) => ({
            id: event.id,
            label: `${event.title} · ${formatDate(event.startsAt, locale, 'monthYearShort')}`,
          }))}
          presetEvent={params.tab === 'impression' ? (preset?.id ?? null) : null}
          member={member}
          siteName={settings.siteName}
          email={settings.contact.mainEmail}
          months={settings.retentionMonths}
          meeting={
            weeklyMeeting.showOnHome ? { day: tDays(weeklyMeeting.day), time: weeklyMeeting.time } : null
          }
        />
      </div>
      <SubmitAside tab={params.tab} became={became} />
    </Container>
  );
}

// /submit (SubmitPage): both tabs; the texts and idea types from Admin › Ideas › Form settings.
// Reads the session (members are sent as themselves), so it sits in <Suspense>.
export default async function SubmitPage({ searchParams }: PageProps<'/[locale]/submit'>) {
  const locale = await currentLocale();
  return (
    <>
      <SubmitHero />
      <Suspense
        fallback={
          <Container className="py-8 lg:py-12">
            <div aria-hidden className="h-[520px] animate-pulse rounded-lg bg-surface" />
          </Container>
        }
      >
        <Submit searchParams={searchParams} locale={locale} />
      </Suspense>
    </>
  );
}
