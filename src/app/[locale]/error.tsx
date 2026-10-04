'use client';

import { useTranslations } from 'next-intl';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('error');
  return (
    <div className="mx-auto max-w-content px-4 py-24 sm:px-6">
      <h1 className="text-h1-m font-bold lg:text-h1">{t('title')}</h1>
      <p className="mt-4 text-muted-ink">{t('text')}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-12 rounded-sm bg-brand px-6 font-medium text-white hover:bg-brand-dark"
      >
        {t('retry')}
      </button>
    </div>
  );
}
