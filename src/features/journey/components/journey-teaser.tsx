import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { Section } from '@/shared/ui/container';
import { Button } from '@/shared/ui/primitives/button';
import { SectionTitle } from '@/shared/ui/section-title';

import type { PublicJourney } from '../types';
import { JourneyIconView } from './journey-icon';

const TEASER_STEPS = 6;

/** "From first meeting to alumni" on Home (Home › Journey teaser): the first six steps and a button to /journey. */
export function JourneyTeaser({ steps }: { steps: PublicJourney['steps'] }) {
  const t = useTranslations('journey.teaser');
  const shown = steps.slice(0, TEASER_STEPS);
  if (shown.length === 0) return null;
  return (
    <Section aria-labelledby="home-journey">
      <div className="flex flex-col items-center gap-8 lg:gap-12">
        <SectionTitle
          id="home-journey"
          eyebrow={t('eyebrow')}
          title={t('title')}
          intro={t('intro', { count: shown.length })}
          align="center"
          className="max-lg:items-start max-lg:text-left [&_p]:max-w-140"
        />
        <div className="relative w-full">
          <span
            aria-hidden
            className="absolute top-7 bottom-7 left-[27px] border-l-2 border-dashed border-brand opacity-45 lg:top-[35px] lg:right-[8%] lg:bottom-auto lg:left-[8%] lg:border-t-2 lg:border-l-0"
          />
          <ol
            className="relative m-0 flex w-full list-none flex-col gap-5 p-0 lg:grid lg:gap-4"
            style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}
          >
            {shown.map((step) => (
              <li
                key={step.id}
                className="relative grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 lg:flex lg:flex-col lg:gap-2.5 lg:text-center"
              >
                <span
                  aria-hidden
                  className="flex size-14 items-center justify-center rounded-full border-2 border-brand bg-white text-brand lg:size-18 lg:shadow-[0_0_0_8px_white]"
                >
                  <JourneyIconView icon={step.icon} className="size-6 lg:size-7" />
                </span>
                <div className="flex flex-col gap-0.5 lg:items-center lg:gap-2.5">
                  <span className="text-[12px] font-bold tracking-[0.08em] text-brand-dark lg:pt-1.5 lg:text-[13px]">
                    {t('step', { number: String(step.n).padStart(2, '0') })}
                  </span>
                  <h3 className="text-[17px] font-bold lg:text-[18px]">{step.title}</h3>
                  <p className="text-small text-muted-ink lg:max-w-[170px]">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <Button asChild className="max-lg:w-full">
          <Link href="/journey">{t('button')}</Link>
        </Button>
      </div>
    </Section>
  );
}
