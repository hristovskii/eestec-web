import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionLink } from '@/shared/ui/action-link';
import { Section } from '@/shared/ui/container';
import { Button } from '@/shared/ui/primitives/button';
import { SectionTitle } from '@/shared/ui/section-title';

import type { PublicTier } from '../../types';
import { HomePartnerTiers } from './partner-marquee';

/**
 * "Our Partners" above the footer on Home: the tiers with at least one active partner, long tiers
 * as a slow row, and a link to the For Companies page. Nothing is shown without partners.
 */
export function PartnerStrip({ tiers }: { tiers: PublicTier[] }) {
  const t = useTranslations('home.partners');
  if (tiers.length === 0) return null;
  return (
    <Section aria-labelledby="home-partners" className="border-t border-line pb-16 lg:pb-22">
      <div className="flex flex-col items-center gap-8 lg:gap-11">
        <SectionTitle id="home-partners" align="center" title={t('title')} />
        <HomePartnerTiers tiers={tiers} />
        <Button asChild variant="secondary">
          <ActionLink href="/partners">
            {t('cta')}
            <ArrowRight aria-hidden />
          </ActionLink>
        </Button>
      </div>
    </Section>
  );
}
