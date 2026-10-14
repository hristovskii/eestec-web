import { CalendarDays, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Container } from '@/shared/ui/container';
import { Button } from '@/shared/ui/primitives/button';

import type { Weekday } from './weekday';

/** Google Maps search for the committee's address (Settings › Contact & legal). */
export const directionsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** The pink box "We meet every Wednesday at 18:00 in Room 117" (Home › Weekly meetings). */
export function MeetingSection({
  meeting,
  address,
}: {
  meeting: { day: Weekday; time: string; room: string };
  /** Where "Get directions" goes; none: no button. */
  address: string | null;
}) {
  const t = useTranslations('home.meeting');
  const bold = (chunks: React.ReactNode) => <strong className="font-bold">{chunks}</strong>;
  return (
    <section aria-labelledby="home-meeting" className="pb-14 lg:pb-24">
      <Container>
        <div className="flex flex-col gap-3.5 rounded-2xl border border-brand/30 bg-brand-tint px-5 py-6 lg:flex-row lg:items-center lg:gap-7 lg:px-9 lg:py-8">
          <div className="flex items-center gap-3 lg:contents">
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white lg:size-16 lg:rounded-2xl"
            >
              <CalendarDays className="size-[22px] lg:size-[30px]" />
            </span>
            <span className="eyebrow lg:hidden">{t('eyebrow')}</span>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="eyebrow max-lg:hidden">{t('eyebrow')}</span>
            <h2
              id="home-meeting"
              className="text-[19px] leading-[1.4] font-medium lg:text-[22px] lg:leading-[1.35]"
            >
              {t.rich('text', {
                day: t(`weekdays.${meeting.day}`),
                time: meeting.time,
                room: meeting.room,
                b: bold,
              })}
            </h2>
            <p className="text-small text-muted-ink">{t('open')}</p>
          </div>
          {address && (
            <Button asChild variant="secondary" className="shrink-0 max-lg:w-full">
              <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer">
                <MapPin aria-hidden />
                {t('directions')}
                <span className="sr-only">{t('newTab')}</span>
              </a>
            </Button>
          )}
        </div>
      </Container>
    </section>
  );
}
