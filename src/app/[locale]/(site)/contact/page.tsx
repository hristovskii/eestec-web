import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ContactDetails, ContactHero, ContactLower, ContactMap } from '@/features/contact';
import { getContact } from '@/features/contact/server';
import { getSiteSettings, pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const page = await getContact(locale);
  return pageMetadata('contact', locale, page.hero.title);
}

// /contact (ContactPage): the texts, subjects and map from Admin › Pages › Contact; the address,
// e-mails, social links and legal info from Admin › Settings.
export default async function ContactPage() {
  const locale = await currentLocale();
  const [page, settings, tDays] = await Promise.all([
    getContact(locale),
    getSiteSettings(locale),
    getTranslations({ locale, namespace: 'common.weekdaysPlural' }),
  ]);
  const { weeklyMeeting } = settings;
  return (
    <>
      <ContactHero page={page} />
      <ContactDetails
        page={page}
        data={{
          email: settings.contact.mainEmail,
          address: settings.contact.address,
          officeRoom: settings.contact.officeRoom,
          meeting: weeklyMeeting.showOnHome
            ? { day: tDays(weeklyMeeting.day), time: weeklyMeeting.time }
            : null,
          boardRoles: settings.boardRoles,
        }}
      />
      <ContactMap page={page} />
      <ContactLower
        page={page}
        social={settings.socialLinks.filter((link) => link.url)}
        legal={settings.legal}
      />
    </>
  );
}
