import { ArrowUpRight, Calendar, CalendarSearch, MapPin, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EventCardSkeleton, OrganizedBadge } from '@/features/events';
import { formatDateRange } from '@/shared/i18n/format';
import { Link } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import type { ResolvedText } from '@/shared/types/localized';
import { Chip, FilterChip, StatusBadge } from '@/shared/ui/chip';
import { Countdown } from '@/shared/ui/countdown';
import { EmptyState } from '@/shared/ui/empty-state';
import { MediaImage } from '@/shared/ui/media-image';
import { Button } from '@/shared/ui/primitives/button';
import { Skeleton } from '@/shared/ui/primitives/skeleton';
import { SocialIcon } from '@/shared/ui/social-icon';

import { countdownTarget } from '../domain/application-state';
import type { UpcomingItem, UpcomingList as UpcomingListData } from '../public-queries';
import { hostOf, useApplyCopy } from './apply-copy';
import { UpcomingCard } from './upcoming-card';

export type UpcomingScope = 'all' | 'local' | 'international';

type UpcomingListProps = {
  list: UpcomingListData;
  scope: UpcomingScope;
  locale: Locale;
  /** Phase 2: "Have an idea for an event?" links to /submit. */
  phase2: boolean;
  /** Settings › Social links (empty state). */
  instagram: { handle: string; url: string } | null;
  /** Settings › Contact & legal › Weekly meeting (empty state). */
  meeting: { day: string; time: string; room: string } | null;
};

const langOf = (text: ResolvedText, locale: Locale) => (text.lang !== locale ? text.lang : undefined);
const applyAnchor = (slug: string) => `apply-${slug}`;

/** /upcoming below the page header (UpcomingList, -Empty, -Mobile, -Mobile-Empty). Soonest first. */
export function UpcomingList({ list, scope, locale, phase2, instagram, meeting }: UpcomingListProps) {
  const t = useTranslations('upcoming');
  const counts = {
    all: list.items.length,
    local: list.items.filter((item) => item.scope === 'local').length,
    international: list.items.filter((item) => item.scope === 'international').length,
  };
  if (counts.all === 0) return <NoUpcomingEvents phase2={phase2} instagram={instagram} meeting={meeting} />;

  const items = scope === 'all' ? list.items : list.items.filter((item) => item.scope === scope);
  const featured = items.find((item) => item.nextUp) ?? items[0];
  const others = items.filter((item) => item !== featured);

  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <div className="flex items-center justify-between gap-4">
        <div
          role="group"
          aria-label={t('filters.label')}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          {(['all', 'local', 'international'] as const).map((option) => (
            <FilterChip
              key={option}
              href={option === 'all' ? '/upcoming' : `/upcoming?scope=${option}`}
              pressed={scope === option}
            >
              {t(`filters.${option}`, { count: counts[option] })}
            </FilterChip>
          ))}
        </div>
        <span className="shrink-0 text-small text-muted-ink max-sm:hidden">{t('soonest')}</span>
      </div>

      {featured ? (
        <>
          <NextUpCard item={featured} now={list.now} locale={locale} />
          {others.length > 0 && (
            <section aria-labelledby="more-upcoming" className="flex flex-col gap-4 pt-3 lg:gap-5 lg:pt-4">
              <h2 id="more-upcoming" className="text-[20px] font-bold lg:text-[24px]">
                {t('more')}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {others.map((item) => (
                  <li key={item.id}>
                    <UpcomingCard item={item} now={list.now} locale={locale} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <EmptyState
          variant="list"
          icon={<CalendarSearch />}
          title={<span className="text-[20px] font-bold">{t('empty.scopeTitle', { scope })}</span>}
          actions={
            <Button asChild variant="secondary">
              <Link href="/upcoming">{t('empty.scopeAction')}</Link>
            </Button>
          }
        >
          {t('empty.scopeText')}
        </EmptyState>
      )}

      {phase2 && (
        <div className="mt-3 flex flex-col gap-3 rounded-lg bg-surface px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-7 lg:mt-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] font-bold sm:text-[20px]">{t('idea.title')}</h2>
            <p className="text-small text-muted-ink">{t('idea.text')}</p>
          </div>
          <Button asChild variant="secondary" className="max-sm:w-full">
            <Link href="/submit">{t('idea.action')}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

/** The big card for the next event (UpcomingList › Next up): countdown and the apply button. */
function NextUpCard({ item, now, locale }: { item: UpcomingItem; now: string; locale: Locale }) {
  const t = useTranslations('upcoming');
  const tBox = useTranslations('applications.box');
  const tEvents = useTranslations('events');
  const copy = useApplyCopy(locale);
  const badge = copy.badge(item.apply, 'card');
  const target = countdownTarget(item.apply);
  const urgent = item.apply.phase === 'deadline_soon';
  const external = item.apply.via === 'external';
  const href = `/upcoming/${item.slug}`;
  const label =
    target?.kind === 'opens'
      ? tBox('opensIn')
      : external
        ? tBox('closesInExternal', { host: hostOf(item.apply.externalUrl) })
        : urgent
          ? tBox('closesInUrgent')
          : tBox('closesIn');
  const dates = formatDateRange(item.startsAt, item.endsAt, locale);
  const scope = tEvents(`scopes.${item.scope}`);

  const primary = item.apply.canApply ? (
    <Button
      asChild
      variant={item.apply.phase === 'full_waitlist' ? 'secondary' : 'primary'}
      className="max-lg:w-full"
    >
      <Link href={`${href}#${applyAnchor(item.slug)}`}>
        {item.apply.phase === 'full_waitlist' ? tBox('waitlist') : tBox('apply')}
      </Link>
    </Button>
  ) : external && (item.apply.phase === 'open' || item.apply.phase === 'deadline_soon') ? (
    <Button asChild className="max-lg:w-full">
      <a href={item.apply.externalUrl} target="_blank" rel="noopener noreferrer">
        {tBox('external', { host: hostOf(item.apply.externalUrl) })}
        <ArrowUpRight aria-hidden />
        <span className="sr-only">{tBox('newTab')}</span>
      </a>
    </Button>
  ) : null;

  return (
    <article
      aria-labelledby={`next-up-${item.slug}`}
      className="grid overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_28px_rgb(0_0_0/0.1)] lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]"
    >
      <div className="relative aspect-[16/10] bg-divider lg:aspect-auto lg:min-h-[460px]">
        <MediaImage media={item.cover} preset="feature" priority />
        {badge && (
          <div className="absolute top-3 left-3 lg:top-4 lg:left-4">
            <StatusBadge tone={badge.tone} overlay>
              {badge.label}
            </StatusBadge>
          </div>
        )}
        {item.organizedByLc && (
          <div className="absolute bottom-4 left-4 max-lg:hidden">
            <OrganizedBadge />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3.5 p-5 lg:gap-4.5 lg:px-10 lg:py-9">
        <span className="eyebrow">{t('nextUp')}</span>
        <div className="flex flex-wrap gap-1.5 max-lg:hidden">
          <Chip>{item.typeName}</Chip>
          <Chip tone="outline">{scope}</Chip>
        </div>
        <h2
          id={`next-up-${item.slug}`}
          className="text-[24px] leading-[1.25] font-bold lg:text-[32px] lg:leading-[1.2]"
          lang={langOf(item.title, locale)}
        >
          <Link href={href} className="text-ink no-underline hover:text-brand-dark">
            {item.title.text}
          </Link>
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-small text-muted-ink max-lg:hidden">
          <span className="flex items-center gap-2">
            <Calendar className="size-4 text-brand" aria-hidden />
            {dates}
          </span>
          <span className="flex items-center gap-2" lang={langOf(item.place, locale)}>
            <MapPin className="size-4 text-brand" aria-hidden />
            {item.place.text}
          </span>
        </div>
        <span className="text-small text-muted-ink lg:hidden">
          {dates} · <span lang={langOf(item.place, locale)}>{item.place.text}</span> · {scope}
        </span>
        {item.shortDescription.text && (
          <p className="text-body text-muted-ink max-lg:hidden" lang={langOf(item.shortDescription, locale)}>
            {item.shortDescription.text}
          </p>
        )}
        {target && (
          <div className="flex flex-col gap-2">
            <span className={urgent ? 'text-small font-medium text-brand-dark' : 'text-small font-medium'}>
              {label}
            </span>
            <Countdown
              target={target.to}
              now={now}
              variant="timer"
              urgent={urgent}
              neutral={target.kind === 'opens'}
              label={label}
            />
          </div>
        )}
        {!target && copy.cardLine(item.apply, now) && (
          <p className="text-small font-medium">{copy.cardLine(item.apply, now)!.text}</p>
        )}
        <div className="mt-auto flex flex-col gap-3 pt-1 lg:flex-row">
          {primary}
          <Button asChild variant="secondary" className="max-lg:hidden">
            <Link href={href}>{t('seeDetails')}</Link>
          </Button>
          <Link
            href={href}
            className="inline-flex min-h-10 items-center self-center text-small font-medium text-brand-dark lg:hidden"
          >
            {t('seeDetails')}
          </Link>
        </div>
      </div>
    </article>
  );
}

/** No upcoming events at all (UpcomingList-Empty, -Mobile-Empty). */
function NoUpcomingEvents({
  phase2,
  instagram,
  meeting,
}: Pick<UpcomingListProps, 'phase2' | 'instagram' | 'meeting'>) {
  const t = useTranslations('upcoming.empty');
  const tIdea = useTranslations('upcoming.idea');
  const tCommon = useTranslations('common');
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <EmptyState
        variant="list"
        accent
        icon={<Calendar />}
        title={<span className="text-[20px] font-bold lg:text-[24px]">{t('title')}</span>}
        actions={
          <>
            {instagram && (
              <Button asChild className="max-sm:w-full">
                <a href={instagram.url} target="_blank" rel="noopener noreferrer">
                  <SocialIcon name="instagram" className="size-[18px]" />
                  {t('follow', { handle: instagram.handle })}
                </a>
              </Button>
            )}
            <Button asChild variant="secondary" className="max-sm:w-full">
              <Link href="/events">{t('past')}</Link>
            </Button>
          </>
        }
      >
        <span className="max-sm:hidden">{t('text')}</span>
        <span className="sm:hidden">{t('textShort')}</span>
      </EmptyState>
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {meeting && (
          <div className="flex items-center gap-3.5 rounded-lg border border-brand/30 bg-brand-tint p-5 lg:gap-5 lg:px-7 lg:py-6">
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand text-white lg:size-13"
            >
              <Users className="size-5.5 lg:size-6" />
            </span>
            <div className="flex flex-col gap-0.5 lg:gap-1">
              <h3 className="text-[16px] font-bold lg:text-[18px]">{t('meetingTitle')}</h3>
              <p className="text-small text-muted-ink">
                {t('meetingText', {
                  day: tCommon(`weekdaysPlural.${meeting.day}` as 'weekdaysPlural.wednesday'),
                  time: meeting.time,
                  room: meeting.room,
                })}
              </p>
            </div>
          </div>
        )}
        {phase2 && (
          <div className="flex flex-col gap-3 rounded-lg bg-surface p-5 sm:flex-row sm:items-center lg:gap-5 lg:px-7 lg:py-6">
            <div className="flex flex-1 flex-col gap-1">
              <h3 className="text-[16px] font-bold lg:text-[18px]">{tIdea('title')}</h3>
              <p className="text-small text-muted-ink">{t('ideaText')}</p>
            </div>
            <Button asChild variant="secondary" className="max-sm:w-full">
              <Link href="/submit">{tIdea('action')}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** First load of /upcoming: chips, the Next-up card and three cards. */
export function UpcomingListSkeleton() {
  const t = useTranslations('events.results');
  return (
    <div className="flex flex-col gap-5 lg:gap-8" role="status" aria-label={t('loading')}>
      <div className="flex gap-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-[520px] w-full rounded-lg lg:h-[460px]" />
      <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <li key={index}>
            <EventCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
