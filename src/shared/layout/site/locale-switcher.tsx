'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { routing } from '@/shared/i18n/routing';
import { cn } from '@/shared/lib/cn';

/** MK / EN switch on the red header (MK first: it is the default). Links to the same page in the other language. */
export function LocaleSwitcher({ size = 'md', pathname }: { size?: 'sm' | 'md'; pathname: string }) {
  const t = useTranslations('common');
  const current = useLocale();
  return (
    <nav
      aria-label={t('languageSwitch')}
      className={cn(
        'flex shrink-0 items-center rounded-sm border border-white/70',
        size === 'md' ? 'p-[3px]' : 'p-0.5',
      )}
    >
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          hrefLang={locale}
          lang={locale}
          aria-current={locale === current ? 'true' : undefined}
          className={cn(
            'flex items-center justify-center rounded-[6px] text-small font-medium no-underline',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white',
            size === 'md' ? 'h-8 min-w-10 px-2' : 'h-9 min-w-[38px] px-1.5',
            locale === current ? 'bg-white text-brand-dark' : 'text-white hover:bg-white/15',
          )}
        >
          {t(`localeNames.${locale}`)}
        </Link>
      ))}
    </nav>
  );
}
