import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { pageMetadata } from '@/features/settings/server';
import { currentLocale } from '@/shared/i18n/current-locale';

import { Link } from '@/shared/i18n/navigation';
import { routing } from '@/shared/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('home', await currentLocale());
}

// Placeholder until the Home milestone (M8). Proves locale routing: / is MK, /en is EN.
export default async function HomePage() {
  const t = await getTranslations();
  return (
    <div className="mx-auto max-w-content px-4 py-24 sm:px-6">
      <h1 className="text-h1-m font-bold lg:text-h1">{t('common.siteName')}</h1>
      <div className="mt-3 h-1 w-14 rounded-full bg-brand" aria-hidden />
      <p className="mt-6 text-muted-ink">{t('placeholder.foundation')}</p>
      <nav aria-label={t('common.languageSwitch')} className="mt-8 flex gap-3">
        {routing.locales.map((locale) => (
          <Link key={locale} href="/" locale={locale} className="font-medium text-brand-dark underline">
            {t(`common.localeNames.${locale}`)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
