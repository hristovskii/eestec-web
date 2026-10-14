import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import {
  HowToJoin,
  JOIN_SECTIONS,
  JoinApply,
  JoinFaq,
  JoinHero,
  JoinSubNav,
  RulesSection,
  WhoCanJoin,
  WhyJoin,
} from '@/features/join';
import { getJoin, getMeetingInfo } from '@/features/join/server';
import { getSiteSettings, pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const join = await getJoin(locale);
  return pageMetadata('join', locale, join.hero.title);
}

// /join (JoinPage): sections from Admin › Pages › Join Us. The next info session, the contact
// e-mail and the Instagram link come from Settings.
export default async function JoinPage() {
  const locale = await currentLocale();
  const [join, settings, meeting, tCommon] = await Promise.all([
    getJoin(locale),
    getSiteSettings(locale),
    getMeetingInfo(locale),
    getTranslations('common'),
  ]);
  const { weeklyMeeting } = settings;
  const email = settings.contact.mainEmail;
  const instagram = settings.socialLinks.find((link) => link.platform === 'instagram')?.url ?? null;
  // "Wednesdays, 18:00 · Room 117, FEEIT" for the closed card.
  const closedMeeting = weeklyMeeting.showOnHome
    ? `${tCommon(`weekdaysPlural.${weeklyMeeting.day}` as 'weekdaysPlural.wednesday')}, ${weeklyMeeting.time} · ${weeklyMeeting.room}`
    : null;

  return (
    <>
      <JoinHero hero={join.hero} glance={join.glance} nextSession={meeting?.text ?? null} hasForm />
      <JoinSubNav sections={JOIN_SECTIONS} hasForm />
      <WhyJoin join={join} />
      <WhoCanJoin join={join} email={email} />
      <HowToJoin join={join} hasForm />
      <RulesSection join={join} />
      <JoinFaq join={join} email={email} />
      <JoinApply
        join={join}
        siteName={settings.siteName}
        meeting={meeting}
        closedMeeting={closedMeeting}
        instagram={instagram}
      />
    </>
  );
}
