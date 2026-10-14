import { ArrowRight, CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionLink } from '@/shared/ui/action-link';
import { Container } from '@/shared/ui/container';
import { Button } from '@/shared/ui/primitives/button';

import type { PublicJourney } from '../types';

/**
 * The red band at the end of /journey: heading, text, the big button, and the weekly meeting line
 * (Settings; the page passes it only while "Show on Home" is on there).
 */
export function JourneyCta({
  cta,
  meeting,
}: {
  cta: PublicJourney['cta'];
  /** "Wednesdays, 18:00 · Room 117, FEEIT", already worded for the language. */
  meeting: string | null;
}) {
  const t = useTranslations('journey.cta');
  return (
    <section aria-labelledby="journey-cta" className="pb-16 lg:pb-24">
      <Container>
        <div className="flex flex-col items-center gap-5.5 rounded-3xl bg-brand bg-[radial-gradient(rgb(255_255_255/0.16)_1.5px,transparent_1.6px)] bg-size-[22px_22px] px-6 py-14 text-center text-white lg:px-8 lg:py-20 lg:pb-21">
          <h2 id="journey-cta" className="max-w-180 text-[32px] leading-[1.15] font-bold lg:text-[44px]">
            {cta.title}
          </h2>
          <p className="max-w-150 text-[18px] leading-[1.5] font-medium lg:text-[20px]">{cta.text}</p>
          {cta.button && (
            <Button asChild variant="inverse" size="xl" className="mt-2.5 max-sm:w-full">
              <ActionLink href={cta.button.href}>
                {cta.button.label}
                <ArrowRight aria-hidden />
              </ActionLink>
            </Button>
          )}
          {meeting && (
            <span className="flex items-center gap-2 text-[15px] font-medium">
              <CalendarDays className="size-4" aria-hidden />
              <span className="sr-only">{t('meetingLabel')}: </span>
              {meeting}
            </span>
          )}
        </div>
      </Container>
    </section>
  );
}
