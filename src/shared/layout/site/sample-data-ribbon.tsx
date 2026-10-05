import { useTranslations } from 'next-intl';

/** Shown on preview deployments while the site runs on sample data (docs/ARCHITECTURE.md §4.2). */
export function SampleDataRibbon() {
  const t = useTranslations('common');
  return (
    <div role="note" className="bg-ink px-4 py-1.5 text-center text-[13px] font-medium text-white">
      {t('sampleData')}
    </div>
  );
}
