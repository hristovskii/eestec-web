import { useTranslations } from 'next-intl';

import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Container } from '@/shared/ui/container';
import { TitleBar } from '@/shared/ui/section-title';

import { ShareMemoryButton } from './share-memory-button';

/**
 * The grey band of /memories (MemoriesList): breadcrumbs, title, intro with the numbers, and the
 * "Been to an EESTEC event?" card on desktop (a plain button row on phones).
 */
export function MemoriesHero({
  totals,
  member,
}: {
  totals: { stories: number; events: number; cities: number };
  member: boolean;
}) {
  const t = useTranslations('memories');
  const tNav = useTranslations('nav');
  return (
    <div className="bg-surface">
      <Container className="flex flex-col gap-5 py-8 lg:py-10">
        <Breadcrumbs items={[{ label: tNav('home'), href: '/' }, { label: t('title') }]} />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="flex flex-col gap-3">
            <h1 className="type-h1">{t('heading')}</h1>
            <TitleBar />
            <p className="mt-2 max-w-[680px] text-[17px] leading-[1.6] text-ink-2">{t('lead')}</p>
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
              {(['stories', 'events', 'cities'] as const).map((key) => (
                <div key={key} className="flex items-baseline gap-2">
                  <dt className="order-2 text-small text-muted-ink">
                    {t(`stats.${key}`, { count: totals[key] })}
                  </dt>
                  <dd className="order-1 text-[22px] font-bold text-brand">{totals[key]}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-3 rounded-md border border-line bg-white p-5 lg:w-[340px] lg:shrink-0">
            <h2 className="text-[18px] leading-[1.3] font-bold">{t('shareCard.title')}</h2>
            <p className="text-small text-muted-ink">
              {member ? t('shareCard.member') : t('shareCard.guest')}
            </p>
            <ShareMemoryButton member={member} block />
          </div>
        </div>
      </Container>
    </div>
  );
}
