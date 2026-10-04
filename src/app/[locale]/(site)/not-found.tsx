import { getTranslations } from 'next-intl/server';

import { Link } from '@/shared/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <div className="mx-auto max-w-content px-4 py-24 sm:px-6">
      <h1 className="text-h1-m font-bold lg:text-h1">{t('title')}</h1>
      <p className="mt-4 text-muted-ink">{t('text')}</p>
      <Link href="/" className="mt-6 inline-block font-medium text-brand-dark underline">
        {t('home')}
      </Link>
    </div>
  );
}
