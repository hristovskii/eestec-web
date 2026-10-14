import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Container } from '@/shared/ui/container';

import type { PublicJourney } from '../types';

/** The red top of /journey: line, H1, lead and the step pills that jump to each step. */
export function JourneyHero({ hero, steps }: { hero: PublicJourney['hero']; steps: PublicJourney['steps'] }) {
  const t = useTranslations('journey.hero');
  return (
    <section
      aria-label={hero.title}
      className="bg-brand bg-[radial-gradient(rgb(255_255_255/0.16)_1.5px,transparent_1.6px)] bg-size-[22px_22px] text-white"
    >
      <Container className="flex flex-col gap-4 py-11 pb-10 lg:items-center lg:gap-5.5 lg:py-20 lg:pb-22 lg:text-center">
        {hero.eyebrow && (
          <span className="text-small font-bold tracking-[0.1em] uppercase">{hero.eyebrow}</span>
        )}
        <h1 className="max-w-190 text-[34px] leading-[1.15] font-bold lg:text-[56px] lg:leading-[1.1]">
          {hero.title}
        </h1>
        <p className="max-w-150 text-[18px] leading-[1.5] font-medium lg:text-[20px]">{hero.lead}</p>
        <nav
          aria-label={t('steps')}
          className="-mx-4 mt-1.5 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:mt-0 lg:flex-wrap lg:justify-center lg:overflow-visible lg:px-0 lg:pt-3.5"
        >
          {steps.map((step) => (
            <a
              key={step.id}
              href={`#step-${step.n}`}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/70 pr-3.5 pl-1.5 text-small font-medium whitespace-nowrap text-white no-underline hover:bg-white/15 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <b className="flex size-7 items-center justify-center rounded-full bg-white text-[13px] font-bold text-brand">
                {step.n}
              </b>
              {step.title}
            </a>
          ))}
        </nav>
        <span className="hidden flex-col items-center gap-1.5 pt-4.5 text-small font-medium lg:flex">
          {t('scroll')}
          <ChevronDown className="size-5" aria-hidden />
        </span>
      </Container>
    </section>
  );
}
