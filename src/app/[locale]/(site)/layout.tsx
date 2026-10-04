import { getTranslations } from 'next-intl/server';

// Header and Footer arrive in M2.
export default async function SiteLayout({ children }: LayoutProps<'/[locale]'>) {
  const t = await getTranslations('common');
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-white focus:px-4 focus:py-2"
      >
        {t('skipToContent')}
      </a>
      <main id="main">{children}</main>
    </>
  );
}
