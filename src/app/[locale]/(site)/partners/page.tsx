import type { Metadata } from 'next';

import {
  PackagesSection,
  PartnersContact,
  PartnersHero,
  PartnersWall,
  WhyPartner,
} from '@/features/partners';
import { getPartners } from '@/features/partners/server';
import { pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const page = await getPartners(locale);
  return pageMetadata('partners', locale, page.hero.title);
}

// /partners (PartnersPage, "For Companies"): everything from Admin › Pages › Sponsors.
export default async function PartnersPage() {
  const locale = await currentLocale();
  const page = await getPartners(locale);
  return (
    <>
      <PartnersHero page={page} />
      <WhyPartner page={page} />
      <PackagesSection page={page} />
      <PartnersWall page={page} />
      <PartnersContact page={page} />
    </>
  );
}
