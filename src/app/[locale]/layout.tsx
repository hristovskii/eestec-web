import '@/shared/styles/globals.css';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locale as rootLocale } from 'next/root-params';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import { getSiteSettings } from '@/features/settings/server';
import { SITE_URL } from '@/shared/config/site';
import { pinnedNow } from '@/shared/lib/now';
import { routing } from '@/shared/i18n/routing';
import { roboto } from '@/shared/styles/fonts';
import { ClockProvider } from '@/shared/ui/clock-provider';
import { Toaster } from '@/shared/ui/primitives/sonner';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// The shipped icon is app/icon.png; a replacement from Settings › Branding is linked explicitly.
const DEFAULT_ICON = '/brand/eestecredsquare.png';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await rootLocale();
  const [t, settings] = await Promise.all([
    getTranslations('metadata'),
    getSiteSettings(locale === 'en' ? 'en' : 'mk'),
  ]);
  const icon = settings.branding.icon.src;
  return {
    metadataBase: SITE_URL,
    // Title suffix " · <site name>" (Settings › SEO).
    title: { default: settings.siteName, template: `%s · ${settings.siteName}` },
    description: t('defaultDescription'),
    ...(icon !== DEFAULT_ICON ? { icons: { icon, apple: icon } } : {}),
  };
}

export default async function LocaleLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  // Client components get only the namespaces they need (docs/ARCHITECTURE.md §7).
  const messages = await getMessages();

  return (
    <html lang={locale} className={roboto.variable}>
      <body>
        <NextIntlClientProvider
          messages={{ common: messages.common, error: messages.error, ui: messages.ui, nav: messages.nav }}
        >
          <ClockProvider pinnedNow={pinnedNow()}>{children}</ClockProvider>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
