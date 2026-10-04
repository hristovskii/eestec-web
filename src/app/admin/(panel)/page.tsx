import { getTranslations } from 'next-intl/server';

// Placeholder until the admin foundation (M3): login, guard, shell, dashboard.
export default async function AdminDashboardPage() {
  const t = await getTranslations('admin');
  return (
    <main className="mx-auto max-w-content px-6 py-16">
      <h1 className="text-h3 font-bold">{t('title')}</h1>
      <p className="mt-3 text-muted-ink">{t('placeholder')}</p>
    </main>
  );
}
