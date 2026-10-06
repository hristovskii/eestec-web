import { Calendar, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type * as React from 'react';

import { formatDateRange } from '@/shared/i18n/format';
import type { Locale } from '@/shared/i18n/routing';
import { BrandLogo } from '@/shared/ui/brand-logo';
import { Chip, StatusBadge } from '@/shared/ui/chip';
import { MediaCard, MediaCardMeta, MediaCardSkeleton } from '@/shared/ui/media-card';

import type { EventCardModel } from '../types';

/** "Organized by LC Skopje" pill with the round logo (EventCard, EventDetail). */
export function OrganizedBadge({ className }: { className?: string }) {
  const t = useTranslations('events.card');
  return (
    <span
      className={
        className ??
        'inline-flex h-[30px] items-center gap-2 rounded-full bg-white pr-3 pl-1 text-[13px] font-medium text-ink shadow-badge'
      }
    >
      <BrandLogo variant="icon" height={22} alt="" className="rounded-full" />
      {t('organized')}
    </span>
  );
}

/**
 * The event card (EventCard): cover, type and category chips, title, dates and place, "View
 * event". Past events show "Just ended" for Settings › Events days. On /upcoming the applications
 * feature passes the status badge, the deadline line and the call to action (UpcomingStates).
 */
export function EventCard({
  event,
  locale,
  href,
  headingLevel,
  status,
}: {
  event: EventCardModel;
  locale: Locale;
  /** Defaults to the archive page of the event. */
  href?: string;
  headingLevel?: 'h2' | 'h3';
  /** Upcoming events: badge on the cover, a line under the place, and the link text. */
  status?: { badge?: React.ReactNode; line?: React.ReactNode; cta?: string };
}) {
  const t = useTranslations('events');
  return (
    <MediaCard
      href={href ?? `/events/${event.slug}`}
      title={event.title.text}
      titleLang={event.title.lang !== locale ? event.title.lang : undefined}
      cover={event.cover}
      ctaLabel={status?.cta ?? t('card.view')}
      headingLevel={headingLevel}
      badge={
        status ? (
          status.badge
        ) : event.justEnded ? (
          <StatusBadge tone="dark" overlay>
            {t('card.justEnded')}
          </StatusBadge>
        ) : undefined
      }
      cornerBadge={event.organizedByLc ? <OrganizedBadge /> : undefined}
      chips={
        <>
          <Chip size="sm">{event.typeName}</Chip>
          <Chip size="sm" tone="outline">
            {t(`scopes.${event.scope}`)}
          </Chip>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <MediaCardMeta icon={<Calendar />}>
          <span className="sr-only">{t('card.date')}: </span>
          {formatDateRange(event.startsAt, event.endsAt, locale)}
        </MediaCardMeta>
        <MediaCardMeta icon={<MapPin />}>
          <span className="sr-only">{t('card.place')}: </span>
          <span lang={event.place.lang !== locale ? event.place.lang : undefined}>{event.place.text}</span>
        </MediaCardMeta>
      </div>
      {status?.line}
    </MediaCard>
  );
}

export { MediaCardSkeleton as EventCardSkeleton };
