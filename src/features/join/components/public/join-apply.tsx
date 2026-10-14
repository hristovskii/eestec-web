import { ArrowRight, Compass } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { Container } from '@/shared/ui/container';
import { SectionTitle } from '@/shared/ui/section-title';

import type { PublicJoin } from '../../types';
import { JoinClosed } from './join-closed';
import { JoinForm } from './join-form';

/**
 * "6 · Apply" (JoinPage › Apply): the heading and a link to the Journey on the left; on the right
 * the form while applications are open, or the closed card.
 */
export function JoinApply({
  join,
  siteName,
  meeting,
  closedMeeting,
  instagram,
}: {
  join: PublicJoin;
  siteName: string;
  /** Next weekly meeting with calendar links (success message); null when not shown. */
  meeting: { sentence: string; google: string; ics: string } | null;
  /** "Wednesdays at 18:00, room 117, FEEIT" for the closed card. */
  closedMeeting: string | null;
  instagram: string | null;
}) {
  const t = useTranslations('join.apply');
  const tEyebrow = useTranslations('join.eyebrow');
  return (
    <section id="apply" aria-labelledby="apply-title" className="scroll-mt-32 pb-16 lg:pb-24 xl:scroll-mt-36">
      <Container className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-14">
        <div className="flex flex-col gap-5.5 lg:pt-3">
          <SectionTitle id="apply-title" eyebrow={tEyebrow('apply')} title={join.headings.apply} />
          {join.apply.intro && <p className="text-[17px] leading-[1.6] lg:text-[18px]">{join.apply.intro}</p>}
          <Link
            href="/journey"
            className="grid grid-cols-[52px_minmax(0,1fr)_20px] items-center gap-4 rounded-2xl border border-line p-5 text-ink no-underline hover:border-line-strong hover:shadow-[0_4px_16px_rgb(0_0_0/0.08)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span
              aria-hidden
              className="flex size-13 items-center justify-center rounded-full bg-brand text-white"
            >
              <Compass className="size-6" />
            </span>
            <span className="flex flex-col gap-0.5">
              <strong className="text-[17px]">{t('journeyTitle')}</strong>
              <span className="text-small text-muted-ink">{t('journeyText')}</span>
            </span>
            <ArrowRight className="size-5 text-muted-ink" aria-hidden />
          </Link>
        </div>
        {join.apply.open ? (
          <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_6px_20px_rgb(0_0_0/0.06)] lg:p-9">
            <JoinForm apply={join.apply} siteName={siteName} meeting={meeting} />
          </div>
        ) : (
          <JoinClosed nextRound={join.apply.nextRound} meeting={closedMeeting} instagram={instagram} />
        )}
      </Container>
    </section>
  );
}
