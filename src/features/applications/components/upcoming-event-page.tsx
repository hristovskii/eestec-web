import { useTranslations } from 'next-intl';

import { UpcomingEventDetail } from '@/features/events';
import { SITE_URL } from '@/shared/config/site';
import { formatDate } from '@/shared/i18n/format';
import { getPathname } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import { StatusBadge } from '@/shared/ui/chip';

import { countdownTarget } from '../domain/application-state';
import { googleCalendarUrl } from '../domain/calendar';
import type { UpcomingPage } from '../public-queries';
import type { CalendarLinks } from './add-to-calendar';
import { ApplicationForm } from './application-form';
import { ApplyBox } from './apply-box';
import { hostOf, useApplyCopy } from './apply-copy';
import { StickyApplyBar } from './sticky-apply-bar';

type UpcomingEventPageProps = {
  page: UpcomingPage;
  locale: Locale;
  siteName: string;
  /** Settings › Contact: used when the event has no questions e-mail. */
  mainEmail: string;
  instagram: string | null;
};

/** The calendar file and the Google link of an event page (also used after applying). */
export function calendarLinks(event: UpcomingPage['event'], locale: Locale): CalendarLinks {
  const page = getPathname({ href: `/upcoming/${event.slug}`, locale });
  return {
    google: googleCalendarUrl({
      id: event.id,
      title: event.title.text,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      allDay: event.allDay,
      location: event.location.text,
      description: event.shortDescription.text,
      url: new URL(page, SITE_URL).toString(),
    }),
    ics: getPathname({ href: `/upcoming/${event.slug}/calendar`, locale }),
  };
}

/** /upcoming/[slug]: the event page with its ApplyBox, application form and sticky apply bar. */
export function UpcomingEventPage({ page, locale, siteName, mainEmail, instagram }: UpcomingEventPageProps) {
  const t = useTranslations('applications');
  const copy = useApplyCopy(locale);
  const { event, apply, form, now } = page;
  const calendar = calendarLinks(event, locale);
  const badge = copy.badge(apply, 'box');
  const anchor = `apply-${event.slug}`;
  const contactEmail = event.contactEmail || mainEmail;
  const external = apply.via === 'external';
  const target = countdownTarget(apply);
  const resultsBy = apply.resultsOn ? formatDate(`${apply.resultsOn}T12:00:00Z`, locale, 'date') : null;

  const bar =
    apply.canApply || (external && (apply.phase === 'open' || apply.phase === 'deadline_soon')) ? (
      <StickyApplyBar
        mode={external ? 'external' : apply.phase === 'full_waitlist' ? 'waitlist' : 'apply'}
        href={external ? apply.externalUrl : `#${anchor}`}
        closesAt={target?.kind === 'closes' ? target.to : null}
        now={now}
        label={
          apply.phase === 'full_waitlist'
            ? t('bar.full')
            : apply.late
              ? t('bar.lateLabel')
              : t('bar.closesIn')
        }
        buttonLabel={
          external
            ? t('box.external', { host: hostOf(apply.externalUrl) })
            : apply.phase === 'full_waitlist'
              ? t('box.waitlist')
              : t('box.apply')
        }
        hideWhenVisible={anchor}
        name={t('bar.label')}
      />
    ) : undefined;

  return (
    <UpcomingEventDetail
      event={event}
      locale={locale}
      contactEmail={contactEmail}
      coverBadge={
        badge ? (
          <StatusBadge tone={badge.tone} overlay>
            {badge.label}
          </StatusBadge>
        ) : undefined
      }
      applyBox={(layout) => (
        <ApplyBox
          idPrefix={`${event.slug}-box-${layout}`}
          state={apply}
          now={now}
          locale={locale}
          event={{ organizer: event.organizer, feePrice: event.fee.price.text }}
          calendar={calendar}
          instagram={instagram}
          applyHref={`#${anchor}`}
        />
      )}
      apply={
        form ? (
          <section
            id={anchor}
            // A fixed name: the heading inside is replaced by the confirmation after sending.
            aria-label={apply.phase === 'full_waitlist' ? t('form.titleWaitlist') : t('form.title')}
            className="scroll-mt-24 lg:rounded-lg lg:border lg:border-line lg:p-10"
          >
            <ApplicationForm
              eventSlug={event.slug}
              eventTitle={event.title.text}
              form={form}
              waitlist={apply.phase === 'full_waitlist'}
              deadline={apply.late ? null : formatDate(apply.closesAt, locale, 'dayDateTime')}
              resultsBy={resultsBy}
              siteName={siteName}
              contactEmail={contactEmail}
              calendar={calendar}
            />
          </section>
        ) : undefined
      }
      bar={bar}
    />
  );
}
