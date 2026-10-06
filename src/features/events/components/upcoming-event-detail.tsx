import { Calendar, Cpu, Flag, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type * as React from 'react';

import { formatDate, formatDayRange } from '@/shared/i18n/format';
import { Link } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import { cn } from '@/shared/lib/cn';
import type { ResolvedText } from '@/shared/types/localized';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Chip } from '@/shared/ui/chip';
import { Container } from '@/shared/ui/container';
import { MediaImage } from '@/shared/ui/media-image';
import { RichText } from '@/shared/ui/rich-text';
import { TitleBar } from '@/shared/ui/section-title';

import { daySpan } from '../domain/event-content';
import type { EventPageModel, PublicAgendaItem } from '../types';
import { OrganizedBadge } from './event-card';

type UpcomingEventDetailProps = {
  event: EventPageModel;
  locale: Locale;
  /** Status badge on the cover (desktop). */
  coverBadge?: React.ReactNode;
  /** ApplyBox in the sticky right column (desktop) and after the header (phones). */
  applyBox: (layout: 'desktop' | 'mobile') => React.ReactNode;
  /** The application form section, when applications are open. */
  apply?: React.ReactNode;
  /** "Questions? Write to …": the event's e-mail, else the main e-mail from Settings. */
  contactEmail: string;
  /** Sticky apply bar (phones), at the end of the page. */
  bar?: React.ReactNode;
};

const langOf = (text: ResolvedText, locale: Locale) => (text.lang !== locale ? text.lang : undefined);
const sectionTitle = 'text-[22px] leading-[1.3] font-bold lg:text-[28px] lg:leading-[1.25]';

/**
 * /upcoming/[slug] (UpcomingDetail, -Mobile, -Mobile-Viewport): cover, header, about, programme,
 * who can apply + fee, the application form; the ApplyBox and the details in the right column.
 * The application parts come from the applications feature through the slots.
 */
export function UpcomingEventDetail({
  event,
  locale,
  coverBadge,
  applyBox,
  apply,
  contactEmail,
  bar,
}: UpcomingEventDetailProps) {
  const t = useTranslations('events');
  const tUp = useTranslations('upcoming');
  const tApp = useTranslations('applications.detail');
  const tNav = useTranslations('nav');
  const dates = formatDayRange(event.startsAt, event.endsAt, locale);
  const hasFee = !!event.fee.price.text || !!event.fee.note.text;

  return (
    <>
      <Container className="hidden pt-6 pb-5 lg:block">
        <Breadcrumbs
          items={[
            { label: tNav('home'), href: '/' },
            { label: tNav('upcoming'), href: '/upcoming' },
            { label: event.title.text },
          ]}
        />
      </Container>
      <div className="px-2 py-1.5 lg:hidden">
        <Link
          href="/upcoming"
          className="inline-flex min-h-11 items-center px-2 text-small font-medium text-brand-dark"
        >
          {tUp('back')}
        </Link>
      </div>
      <Container className="max-lg:px-0">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-divider lg:aspect-[21/9] lg:rounded-lg">
          <MediaImage media={event.cover} preset="cover" priority />
          {coverBadge && <div className="absolute top-5 left-5 max-lg:hidden">{coverBadge}</div>}
        </div>
      </Container>

      <Container className="grid items-start gap-9 pt-6 pb-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-14 lg:pt-10 lg:pb-24">
        <article className="flex min-w-0 flex-col gap-9 lg:gap-14">
          <header className="flex flex-col gap-3.5 lg:gap-4.5">
            <div className="flex flex-wrap gap-1.5 lg:gap-2">
              <Chip className="h-[30px]">{event.typeName}</Chip>
              <Chip tone="outline" className="h-[30px]">
                {t(`scopes.${event.scope}`)}
              </Chip>
              {event.organizedByLc && (
                <OrganizedBadge className="inline-flex h-[30px] items-center gap-2 rounded-full border border-line bg-white pr-3 pl-1 text-small font-medium text-ink" />
              )}
            </div>
            <h1 className="type-h1" lang={langOf(event.title, locale)}>
              {event.title.text}
            </h1>
            <span className="text-small text-muted-ink lg:hidden">
              {dates} · <span lang={langOf(event.place, locale)}>{event.place.text}</span>
            </span>
            {event.shortDescription.text && (
              <p
                className="text-[17px] leading-[1.5] text-muted-ink lg:text-[20px]"
                lang={langOf(event.shortDescription, locale)}
              >
                {event.shortDescription.text}
              </p>
            )}
          </header>

          <div className="lg:hidden">{applyBox('mobile')}</div>

          {event.description.text && (
            <section aria-labelledby="about-title" className="flex flex-col gap-3.5 lg:gap-4">
              <h2
                id="about-title"
                className={sectionTitle}
                lang={event.aboutTitle ? langOf(event.aboutTitle, locale) : undefined}
              >
                {event.aboutTitle?.text ?? t('detail.about')}
              </h2>
              <TitleBar className="mb-1 max-lg:w-12" />
              <RichText html={event.description.text} lang={langOf(event.description, locale)} />
            </section>
          )}

          {event.agenda.length > 0 && (
            <section aria-labelledby="programme-title" className="flex flex-col gap-3 lg:gap-4">
              <h2 id="programme-title" className={sectionTitle}>
                {tApp('programme')}
              </h2>
              <Programme items={event.agenda} startsAt={event.startsAt} locale={locale} />
            </section>
          )}

          {(event.requirements.text || hasFee) && (
            <section
              aria-labelledby={event.requirements.text ? 'who-title' : undefined}
              aria-label={event.requirements.text ? undefined : tApp('fee')}
              className="grid items-start gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
            >
              {event.requirements.text && (
                <div className="flex flex-col gap-3.5 lg:gap-4">
                  <h2 id="who-title" className={sectionTitle}>
                    {tApp('whoCanApply')}
                  </h2>
                  <RichText
                    html={event.requirements.text}
                    lang={langOf(event.requirements, locale)}
                    className="rich-checks text-[16px]"
                  />
                </div>
              )}
              {hasFee && <Fee price={event.fee.price} note={event.fee.note} locale={locale} />}
            </section>
          )}

          {apply}

          {contactEmail && (
            <p className="text-small text-muted-ink">
              {tApp.rich('questions', {
                email: contactEmail,
                link: (chunks) => (
                  <a href={`mailto:${contactEmail}`} className="font-medium text-brand-dark underline">
                    {chunks}
                  </a>
                ),
              })}
            </p>
          )}
        </article>

        <aside aria-label={tApp('aside')} className="hidden flex-col gap-5 lg:sticky lg:top-24 lg:flex">
          {applyBox('desktop')}
          <div className="rounded-lg border border-line px-6 pt-2 pb-2.5">
            <Details event={event} dates={dates} locale={locale} />
          </div>
        </aside>
      </Container>
      {bar}
    </>
  );
}

function Programme({
  items,
  startsAt,
  locale,
}: {
  items: PublicAgendaItem[];
  startsAt: string;
  locale: Locale;
}) {
  const t = useTranslations('applications.detail');
  return (
    <ol className="m-0 list-none p-0">
      {items.map((item) => (
        <li
          key={item.id}
          className="grid grid-cols-[76px_minmax(0,1fr)] gap-3.5 border-t border-divider py-3.5 lg:grid-cols-[132px_minmax(0,1fr)] lg:gap-5 lg:py-4"
        >
          <div className="pt-0.5 text-[13px] font-bold tracking-[0.04em] text-brand-dark uppercase lg:text-small">
            {item.date && (
              <>
                {t('day', { number: daySpan(startsAt, `${item.date}T12:00:00Z`) })}
                <span className="block font-medium tracking-normal text-muted-ink normal-case">
                  <span className="lg:hidden">
                    {formatDate(`${item.date}T12:00:00Z`, locale, 'dayMonth')}
                  </span>
                  <span className="max-lg:hidden">
                    {formatDate(`${item.date}T12:00:00Z`, locale, 'weekdayDate')}
                  </span>
                </span>
              </>
            )}
          </div>
          <div>
            <h3 className="mb-1 text-[16px] font-bold lg:text-[17px]" lang={langOf(item.title, locale)}>
              {item.title.text}
            </h3>
            {item.text.text && (
              <p className="text-small text-muted-ink" lang={langOf(item.text, locale)}>
                {item.text.text}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Fee({ price, note, locale }: { price: ResolvedText; note: ResolvedText; locale: Locale }) {
  const t = useTranslations('applications.detail');
  return (
    <div
      className={cn(
        'flex gap-4 rounded-md bg-surface p-5 max-md:items-center md:flex-col md:gap-2 md:rounded-lg md:p-6',
      )}
    >
      <span className="text-small font-medium tracking-[0.06em] text-muted-ink uppercase max-md:sr-only">
        {t('fee')}
      </span>
      {price.text && (
        <span className="text-[32px] leading-[1.1] font-bold md:text-[40px]" lang={langOf(price, locale)}>
          {price.text}
        </span>
      )}
      {note.text && (
        <p className="text-small" lang={langOf(note, locale)}>
          {note.text}
        </p>
      )}
    </div>
  );
}

function Details({ event, dates, locale }: { event: EventPageModel; dates: string; locale: Locale }) {
  const t = useTranslations('events');
  const rows: { icon: React.ReactNode; label: string; value: string; lang?: string }[] = [
    {
      icon: <Calendar />,
      label: daySpan(event.startsAt, event.endsAt) > 1 ? t('detail.dates') : t('detail.date'),
      value: dates,
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
  return (
    <dl>
      {rows.map((row) => (
        <div key={row.label} className="relative border-t border-divider py-3.5 pl-9 first:border-t-0">
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
