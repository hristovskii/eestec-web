import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CircleCheck,
  Cpu,
  Download,
  Flag,
  MapPin,
  MessageSquareHeart,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type * as React from 'react';

import { formatBytes } from '@/features/media';
import { formatDate, formatDateRange } from '@/shared/i18n/format';
import { Link } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import type { ResolvedText } from '@/shared/types/localized';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Chip } from '@/shared/ui/chip';
import { Container } from '@/shared/ui/container';
import { GalleryGrid } from '@/shared/ui/gallery';
import { MediaImage } from '@/shared/ui/media-image';
import { Button } from '@/shared/ui/primitives/button';
import { RichText } from '@/shared/ui/rich-text';
import { TitleBar } from '@/shared/ui/section-title';

import { daySpan, videoEmbed } from '../domain/event-content';
import type { EventLink, EventPageModel } from '../types';
import { OrganizedBadge } from './event-card';
import { VideoPlayer } from './video-player';

type EventDetailProps = {
  event: EventPageModel;
  prev: EventLink | null;
  next: EventLink | null;
  locale: Locale;
  /** Phase 2 (member accounts): "Were you there? Share your impression". */
  phase2: boolean;
};

/** `lang` only when the text fell back to Macedonian on the English page. */
const langOf = (text: ResolvedText, locale: Locale) => (text.lang !== locale ? text.lang : undefined);

/** /events/[slug] (EventDetail, -Mobile, -Minimal, -Ended, -Ended-Mobile). */
export function EventDetail({ event, prev, next, locale, phase2 }: EventDetailProps) {
  const t = useTranslations('events');
  const tNav = useTranslations('nav');
  const scopeHref = `/events?tab=${event.scope}`;
  const scopeLabel = t(`scopes.${event.scope}`);
  const video = videoEmbed(event.videoUrl);
  const ended = event.justEnded;

  const details = <DetailsList event={event} locale={locale} />;
  const header = (
    <header className="flex flex-col gap-3.5 lg:gap-4.5">
      <div className="flex flex-wrap gap-1.5 lg:gap-2">
        {ended && (
          <Chip tone="dark" className="h-[30px]">
            {t('card.justEnded')}
          </Chip>
        )}
        <Chip className="h-[30px]">{event.typeName}</Chip>
        <Chip tone="outline" className="h-[30px]">
          {scopeLabel}
        </Chip>
        {event.organizedByLc && (
          <OrganizedBadge className="inline-flex h-[30px] items-center gap-2 rounded-full border border-line bg-white pr-3 pl-1 text-small font-medium text-ink" />
        )}
      </div>
      <h1 className="type-h1" lang={langOf(event.title, locale)}>
        {event.title.text}
      </h1>
      {event.shortDescription.text && (
        <p
          className="text-[17px] leading-[1.5] text-muted-ink lg:text-[20px]"
          lang={langOf(event.shortDescription, locale)}
        >
          {event.shortDescription.text}
        </p>
      )}
    </header>
  );

  return (
    <>
      <Container className="hidden pt-6 pb-5 lg:block">
        <Breadcrumbs
          items={[
            { label: tNav('home'), href: '/' },
            { label: t('title'), href: '/events' },
            { label: scopeLabel, href: scopeHref },
            { label: event.title.text },
          ]}
        />
      </Container>
      <div className="px-2 py-1.5 lg:hidden">
        <Link
          href={scopeHref}
          className="inline-flex min-h-11 items-center px-2 text-small font-medium text-brand-dark"
        >
          {t('detail.backShort', { scope: event.scope })}
        </Link>
      </div>
      <Container className="max-lg:px-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-divider lg:aspect-[21/9] lg:rounded-lg">
          <MediaImage media={event.cover} preset="cover" priority />
        </div>
      </Container>

      <Container className="grid items-start gap-10 pt-6 pb-14 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-14 lg:pt-10 lg:pb-24">
        <article className="flex min-w-0 flex-col gap-10 lg:gap-14">
          <div className="flex flex-col gap-5">
            {header}
            {ended && <EndedNotice event={event} locale={locale} phase2={phase2} />}
            <div className="lg:hidden">{details}</div>
          </div>

          {event.description.text && (
            <section aria-labelledby="about-title" className="flex flex-col gap-3.5 lg:gap-4">
              <h2
                id="about-title"
                className="text-[22px] leading-[1.3] font-bold lg:text-[28px] lg:leading-[1.25]"
                lang={event.aboutTitle ? langOf(event.aboutTitle, locale) : undefined}
              >
                {event.aboutTitle?.text ?? t('detail.about')}
              </h2>
              <TitleBar className="mb-1 max-lg:w-12" />
              <RichText html={event.description.text} lang={langOf(event.description, locale)} />
            </section>
          )}

          {video && (
            <section aria-labelledby="video-title" className="flex flex-col gap-3.5 lg:gap-4">
              <h2 id="video-title" className="text-[22px] font-bold lg:text-[28px]">
                {t('detail.video')}
              </h2>
              <VideoPlayer embedUrl={video.embedUrl} title={event.title.text} />
            </section>
          )}

          {event.gallery.length > 0 && (
            <section aria-labelledby="gallery-title" className="flex flex-col gap-3.5 lg:gap-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="gallery-title" className="text-[22px] font-bold lg:text-[28px]">
                  {t('detail.gallery')}
                </h2>
                <span className="text-small text-muted-ink">
                  {t('detail.photos', { count: event.gallery.length })}
                </span>
              </div>
              <GalleryGrid photos={event.gallery} title={event.title.text} />
            </section>
          )}

          {/* Memories from this event arrive with Memories (M17); Phase 1 hides sharing (CLAUDE.md). */}
          {phase2 && !ended && (
            <div className="flex flex-col gap-3 rounded-lg bg-surface px-5 py-6 sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:py-7">
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-white sm:size-14"
              >
                <MessageSquareHeart className="size-5.5 sm:size-6.5" />
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <h2 className="text-[19px] font-bold sm:text-[20px]">{t('detail.wereYouThere')}</h2>
                <p className="text-small text-muted-ink">{t('detail.wereYouThereText')}</p>
              </div>
              <Button asChild className="shrink-0 max-sm:w-full">
                <Link href={`/submit?tab=impression&event=${event.slug}`}>{t('detail.shareShort')}</Link>
              </Button>
            </div>
          )}
        </article>

        <aside
          aria-label={t('detail.eventDetails')}
          className="hidden flex-col gap-5 lg:sticky lg:top-24 lg:flex"
        >
          <div className="rounded-lg border border-line bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
            <h2 className="mb-2 text-[20px] font-bold">{t('detail.eventDetails')}</h2>
            {details}
          </div>
          {event.infoPack && <InfoPackLink pack={event.infoPack} />}
          <Link href={scopeHref} className="pl-1 text-small font-medium text-brand-dark">
            {t('detail.back', { scope: event.scope })}
          </Link>
        </aside>
        {event.infoPack && (
          <div className="lg:hidden">
            <InfoPackLink pack={event.infoPack} />
          </div>
        )}
      </Container>

      <AdjacentEvents prev={prev} next={next} locale={locale} />
    </>
  );
}

function DetailsList({ event, locale }: { event: EventPageModel; locale: Locale }) {
  const t = useTranslations('events');
  const days = daySpan(event.startsAt, event.endsAt);
  const rows: { icon: React.ReactNode; label: string; value: string; lang?: string }[] = [
    {
      icon: <Calendar />,
      label: days > 1 ? t('detail.dates') : t('detail.date'),
      value:
        days > 1
          ? t('detail.datesValue', { range: formatDateRange(event.startsAt, event.endsAt, locale), days })
          : formatDate(event.startsAt, locale, event.allDay ? 'dayDate' : 'dayDateTime'),
    },
    {
      icon: <MapPin />,
      label: t('detail.location'),
      value: event.location.text,
      lang: langOf(event.location, locale),
    },
    { icon: <Cpu />, label: t('detail.type'), value: `${event.typeName} · ${t(`scopes.${event.scope}`)}` },
  ];
  if (event.organizer !== '')
    rows.push({
      icon: <Flag />,
      label: t('detail.organizedBy'),
      value: event.organizer ?? t('detail.lcSkopje'),
    });
  if (event.participantCount)
    rows.push({
      icon: <Users />,
      label: t('detail.participants'),
      value: t('detail.participantsValue', {
        count: event.participantCount,
        countries: event.countryCount ?? 0,
      }),
    });

  return (
    <dl className="rounded-md border border-line px-4 py-1 lg:rounded-none lg:border-0 lg:p-0">
      {rows.map((row) => (
        <div
          key={row.label}
          className="relative border-t border-divider py-3.5 pl-9 first:border-t-0 lg:first:border-t"
        >
          <dt className="text-[13px] font-medium tracking-[0.06em] text-muted-ink uppercase">
            <span aria-hidden className="absolute top-4 left-0 text-brand [&_svg]:size-5">
              {row.icon}
            </span>
            {row.label}
          </dt>
          <dd className="mt-0.5 text-[16px] leading-[1.45] font-medium" lang={row.lang}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EndedNotice({ event, locale, phase2 }: { event: EventPageModel; locale: Locale; phase2: boolean }) {
  const t = useTranslations('events.detail');
  const waitingForPhotos = event.gallery.length === 0 && !videoEmbed(event.videoUrl);
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-md bg-surface p-5 sm:gap-4.5 sm:rounded-lg sm:px-8 sm:py-7"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white sm:size-11"
        >
          <CircleCheck className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-bold sm:text-[20px]">
            {t('endedTitle', { date: formatDate(event.endsAt, locale, 'date') })}
          </h2>
          <p className="text-small text-muted-ink sm:text-body">
            {[
              event.participantCount ? t('endedThanks', { count: event.participantCount }) : null,
              t('endedArchive'),
              waitingForPhotos ? t('endedPhotos') : null,
            ]
              .filter(Boolean)
              .join(' ')}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:pl-15">
        {phase2 && (
          <Button asChild className="max-sm:w-full">
            <Link href={`/submit?tab=impression&event=${event.slug}`}>{t('shareImpression')}</Link>
          </Button>
        )}
        <Link href="/upcoming" className="text-small font-medium text-brand-dark">
          {t('seeNext')}
        </Link>
      </div>
    </div>
  );
}

function InfoPackLink({ pack }: { pack: NonNullable<EventPageModel['infoPack']> }) {
  const t = useTranslations('events.detail');
  return (
    <Button asChild variant="secondary" block>
      <a href={pack.src} download={pack.fileName}>
        <Download aria-hidden />
        {t('infoPack', { size: formatBytes(pack.size) })}
      </a>
    </Button>
  );
}

function AdjacentEvents({
  prev,
  next,
  locale,
}: {
  prev: EventLink | null;
  next: EventLink | null;
  locale: Locale;
}) {
  const t = useTranslations('events.detail');
  const card =
    'flex flex-col gap-1.5 rounded-md border border-line px-4.5 py-4 text-ink no-underline transition-[border-color,box-shadow] hover:border-brand hover:shadow-[0_0_0_1px_var(--color-brand)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-6 sm:py-5';
  const meta = (link: EventLink) => (
    <span className="text-small text-muted-ink max-sm:hidden">
      {formatDateRange(link.startsAt, link.endsAt, locale)} ·{' '}
      <span lang={langOf(link.place, locale)}>{link.place.text}</span>
    </span>
  );
  return (
    <nav aria-label={t('moreEvents')} className="border-t border-line">
      <Container className="grid gap-2.5 pt-6 pb-14 sm:grid-cols-2 sm:gap-6 sm:pt-10 sm:pb-18">
        {prev ? (
          <Link href={`/events/${prev.slug}`} className={card}>
            <span className="flex items-center gap-1.5 text-small text-muted-ink">
              <ArrowLeft className="size-4" aria-hidden />
              {t('previous')}
            </span>
            <span className="text-[17px] font-bold sm:text-[20px]" lang={langOf(prev.title, locale)}>
              {prev.title.text}
            </span>
            {meta(prev)}
          </Link>
        ) : (
          <span className="max-sm:hidden" />
        )}
        {next ? (
          <Link href={`/events/${next.slug}`} className={`${card} items-end text-right`}>
            <span className="flex items-center gap-1.5 text-small text-muted-ink">
              {t('next')}
              <ArrowRight className="size-4" aria-hidden />
            </span>
            <span className="text-[17px] font-bold sm:text-[20px]" lang={langOf(next.title, locale)}>
              {next.title.text}
            </span>
            {meta(next)}
          </Link>
        ) : (
          <Link href="/upcoming" className={`${card} items-end border-surface bg-surface text-right`}>
            <span className="text-small text-muted-ink">
              <span className="max-sm:hidden">{t('newest')}</span>
              <span className="sm:hidden">{t('newestShort')}</span>
            </span>
            <span className="text-[17px] font-bold sm:text-[20px]">{t('seeUpcoming')}</span>
          </Link>
        )}
      </Container>
    </nav>
  );
}
