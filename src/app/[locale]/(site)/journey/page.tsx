import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { JourneyCta, JourneyHero, JourneyPath } from '@/features/journey';
import { getJourney } from '@/features/journey/server';
import { getSiteSettings, pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const journey = await getJourney(locale);
  return pageMetadata('journey', locale, journey.hero.title);
}

// /journey (Journey): the steps and their path, from Admin › Pages › Journey. The weekly meeting
// line under the final button comes from Settings and follows its "Show on Home" switch.
export default async function JourneyPage() {
  const locale = await currentLocale();
  const [journey, settings, t, tCommon] = await Promise.all([
    getJourney(locale),
    getSiteSettings(locale),
    getTranslations('journey.cta'),
    getTranslations('common'),
  ]);
  const { weeklyMeeting } = settings;
  const meeting = weeklyMeeting.showOnHome
    ? t('meeting', {
        day: tCommon(`weekdaysPlural.${weeklyMeeting.day}` as 'weekdaysPlural.wednesday'),
        time: weeklyMeeting.time,
        room: weeklyMeeting.room,
      })
    : null;
  return (
    <>
      <JourneyHero hero={journey.hero} steps={journey.steps} />
      {journey.steps.length > 0 && <JourneyPath steps={journey.steps} />}
      <JourneyCta cta={journey.cta} meeting={meeting} />
    </>
  );
}
