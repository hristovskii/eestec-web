import { locale as rootLocale } from 'next/root-params';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { signOut } from '@/features/auth';
import { getSession } from '@/features/auth/server';
import { DevToolbarSlot } from '@/features/devtools/server';
import { getSiteSettings } from '@/features/settings/server';
import { env } from '@/shared/config/env';
import { isEnabled } from '@/shared/config/flags';
import { FOOTER_NAV, MAIN_NAV, visibleNav } from '@/shared/config/site';
import { routing } from '@/shared/i18n/routing';
import { SiteFooter } from '@/shared/layout/site/footer';
import { type HeaderAccount, SiteHeader } from '@/shared/layout/site/header';
import { SampleDataRibbon } from '@/shared/layout/site/sample-data-ribbon';

export default async function SiteLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = (await rootLocale()) ?? routing.defaultLocale;
  const [settings, t, tDays] = await Promise.all([
    getSiteSettings(locale === 'en' ? 'en' : 'mk'),
    getTranslations('common'),
    getTranslations('common.weekdaysPlural'),
  ]);

  const phase2 = isEnabled('phase2');

  // Phase 1 hides everything that needs member accounts (no "Log in", no account menu).
  const account: Promise<HeaderAccount | null> | null = phase2
    ? getSession().then((session) =>
        session
          ? {
              name: session.name,
              initials: session.initials,
              headline: session.headline,
              isAdmin: session.adminRole !== null,
            }
          : null,
      )
    : null;

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-sm focus:bg-white focus:px-4 focus:py-2 focus:text-ink"
      >
        {t('skipToContent')}
      </a>
      {env.VERCEL_ENV && env.DATA_SOURCE === 'mock' && <SampleDataRibbon />}
      <SiteHeader
        items={visibleNav(MAIN_NAV, phase2)}
        account={account}
        signOutAction={signOut}
        logo={settings.branding.white}
      />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter
        explore={visibleNav(FOOTER_NAV.explore, phase2)}
        getInvolved={visibleNav(FOOTER_NAV.getInvolved, phase2)}
        data={{
          siteName: settings.siteName,
          logo: settings.branding.white,
          tagline: settings.footerTagline,
          address: settings.contact.address,
          email: settings.contact.mainEmail,
          meeting: {
            day: tDays(settings.weeklyMeeting.day),
            time: settings.weeklyMeeting.time,
            room: settings.weeklyMeeting.room,
          },
          // A link left empty in Settings is hidden.
          socialLinks: settings.socialLinks.filter((link) => link.url),
          legal: settings.legal,
          year: settings.currentYear,
        }}
      />
      <Suspense fallback={null}>
        <DevToolbarSlot />
      </Suspense>
    </>
  );
}
