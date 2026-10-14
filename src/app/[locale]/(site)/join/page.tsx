import type { Metadata } from 'next';

import {
  HowToJoin,
  JOIN_SECTIONS,
  JoinFaq,
  JoinHero,
  JoinSubNav,
  RulesSection,
  WhoCanJoin,
  WhyJoin,
} from '@/features/join';
import { getJoin } from '@/features/join/server';
import { getSiteSettings, pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';
import { formatDate } from '@/shared/i18n/format';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const join = await getJoin(locale);
  return pageMetadata('join', locale, join.hero.title);
}

// /join (JoinPage): sections from Admin › Pages › Join Us. The next info session and the contact
// e-mail come from Settings. The application form (section 6) arrives with M10c.
export default async function JoinPage() {
  const locale = await currentLocale();
  const [join, settings] = await Promise.all([getJoin(locale), getSiteSettings(locale)]);
  const { weeklyMeeting } = settings;
  const nextSession = weeklyMeeting.showOnHome
    ? `${formatDate(weeklyMeeting.nextAt, locale, 'weekdayDate')} · ${weeklyMeeting.time} · ${weeklyMeeting.room}`
    : null;
  const hasForm = false;
  const email = settings.contact.mainEmail;
  const present = JOIN_SECTIONS.filter((section) => section !== 'apply' || hasForm);

  return (
    <>
      <JoinHero hero={join.hero} glance={join.glance} nextSession={nextSession} hasForm={hasForm} />
      <JoinSubNav sections={present} hasForm={hasForm} />
      <WhyJoin join={join} />
      <WhoCanJoin join={join} email={email} />
      <HowToJoin join={join} hasForm={hasForm} />
      <RulesSection join={join} />
      <JoinFaq join={join} email={email} />
    </>
  );
}
