import { useTranslations } from 'next-intl';

import { Container } from '@/shared/ui/container';
import { SectionTitle } from '@/shared/ui/section-title';

import type { PublicCommittee } from '../types';
import { CommitteeNetwork } from './committee-network';

/** "EESTEC across Europe" (Home › Map): the heading and the committee map with its filters and List view. */
export function CommitteesSection({ committees }: { committees: PublicCommittee[] }) {
  const t = useTranslations('committees.section');
  if (committees.length === 0) return null;
  return (
    <section aria-labelledby="home-network" className="pt-4 pb-14 lg:pt-4 lg:pb-18">
      <Container className="flex flex-col gap-5 lg:gap-7">
        <SectionTitle
          id="home-network"
          eyebrow={t('eyebrow')}
          title={t('title')}
          intro={
            <>
              <span className="max-sm:hidden">{t('intro')}</span>
              <span className="sm:hidden">{t('introShort')}</span>
            </>
          }
        />
        <CommitteeNetwork committees={committees} />
      </Container>
    </section>
  );
}
