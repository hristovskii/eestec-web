import type { Metadata } from 'next';

import {
  CompanyForm,
  PackagesSection,
  PartnersContact,
  PartnersHero,
  PartnersWall,
  WhyPartner,
} from '@/features/partners';
import { getPartners } from '@/features/partners/server';
import { getSiteSettings, pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const page = await getPartners(locale);
  return pageMetadata('partners', locale, page.hero.title);
}

// /partners (PartnersPage, "For Companies"): everything from Admin › Pages › Sponsors.
export default async function PartnersPage() {
  const locale = await currentLocale();
  const [page, settings] = await Promise.all([getPartners(locale), getSiteSettings(locale)]);
  return (
    <>
      <PartnersHero page={page} />
      <WhyPartner page={page} />
      <PackagesSection page={page} />
      <PartnersWall page={page} />
      <PartnersContact page={page}>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_6px_20px_rgb(0_0_0/0.06)] lg:p-8">
          <CompanyForm
            siteName={settings.siteName}
            email={page.contact.person.email}
            offerUrl={page.offer?.file?.src ?? null}
          />
        </div>
      </PartnersContact>
    </>
  );
}
