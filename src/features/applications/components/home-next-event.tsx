import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatDateRange } from '@/shared/i18n/format';
import { Link } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import type { ResolvedText } from '@/shared/types/localized';
import { StatusBadge } from '@/shared/ui/chip';
import { Countdown } from '@/shared/ui/countdown';

import type { UpcomingItem } from '../public-queries';
import { useApplyCopy } from './apply-copy';

const langOf = (text: ResolvedText, locale: Locale) => (text.lang !== locale ? text.lang : undefined);

/**
 * The white "Next event" card in the Home hero (Home-Desktop): status, title, dates and place, a
 * countdown to the start, the application line and a link to the event. The page picks the event
 * the same way /upcoming does ("Show as Next up", else the soonest).
 */
export function HomeNextEvent({ item, now, locale }: { item: UpcomingItem; now: string; locale: Locale }) {
  const t = useTranslations('home.nextEvent');
  const copy = useApplyCopy(locale);
  const badge = copy.badge(item.apply, 'card');
  const line = copy.cardLine(item.apply, now);
  const started = Date.parse(item.startsAt) <= Date.parse(now);
  const href = `/upcoming/${item.slug}`;
  const dates = formatDateRange(item.startsAt, item.endsAt, locale);

  return (
    <article
      aria-labelledby="home-next-event"
      className="flex flex-col gap-3.5 rounded-xl bg-white p-5 text-ink shadow-[0_16px_32px_rgb(0_0_0/0.18)] lg:gap-4.5 lg:rounded-2xl lg:p-7 lg:shadow-[0_24px_48px_rgb(0_0_0/0.18)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">{t('eyebrow')}</span>
        {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
      </div>
      <h2 id="home-next-event" className="type-h3" lang={langOf(item.title, locale)}>
        <Link href={href} className="text-ink no-underline hover:text-brand-dark">
          {item.title.text}
        </Link>
      </h2>
      <div className="flex flex-col gap-1.5 text-small text-muted-ink">
        <span className="flex items-center gap-2">
          <Calendar className="size-4 shrink-0 text-brand" aria-hidden />
          {dates}
        </span>
        <span className="flex items-center gap-2" lang={langOf(item.place, locale)}>
          <MapPin className="size-4 shrink-0 text-brand" aria-hidden />
          {item.place.text} · {item.typeName}
        </span>
      </div>
      {started ? (
        <p className="rounded-sm bg-surface px-3 py-2.5 text-small font-bold">{t('started')}</p>
      ) : (
        <Countdown target={item.startsAt} now={now} variant="timer" label={t('startsIn')} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-3.5">
        {line && <span className="text-small text-muted-ink">{line.text}</span>}
        <Link
          href={href}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 text-small font-medium text-brand-dark"
        >
          {t('details')}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
