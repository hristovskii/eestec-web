import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function AdminNotFound() {
  const t = await getTranslations('notFound');
  return (
    <main className="mx-auto max-w-content px-6 py-16">
      <h1 className="text-h3 font-bold">{t('title')}</h1>
      <p className="mt-3 text-muted-ink">{t('text')}</p>
      <Link href="/admin" className="mt-6 inline-block font-medium text-brand-dark underline">
        {t('admin')}
      </Link>
    </main>
  );
}
