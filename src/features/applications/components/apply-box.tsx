import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type * as React from 'react';

import { formatDate } from '@/shared/i18n/format';
import { Link } from '@/shared/i18n/navigation';
import type { Locale } from '@/shared/i18n/routing';
import { cn } from '@/shared/lib/cn';
import { StatusBadge } from '@/shared/ui/chip';
import { Countdown } from '@/shared/ui/countdown';
import { Button } from '@/shared/ui/primitives/button';

import { type ApplyState, countdownTarget } from '../domain/application-state';
import { AddToCalendar, type CalendarLinks } from './add-to-calendar';
import { hostOf, useApplyCopy } from './apply-copy';

export type ApplyBoxEvent = {
  /** null: LC Skopje; '' unknown. */
  organizer: string | null;
  /** "Free for FEEIT students": the footnote when there is no results date. */
  feePrice: string;
};

type ApplyBoxProps = {
  state: ApplyState;
  /** Server "now" of the render. */
  now: string;
  locale: Locale;
  event: ApplyBoxEvent;
  calendar: CalendarLinks;
  /** Instagram handle from Settings › Social links ("Opening soon" footnote). */
  instagram: string | null;
  /** Where "Apply now" goes: the form on the page. */
  applyHref: string;
  /** The page shows the box twice (phone and desktop layouts): ids stay unique. */
  idPrefix: string;
  className?: string;
};

/**
 * Application box (ApplyBox, UpcomingStates): status, countdown, the apply button, places and
 * "Add to calendar". The state comes from domain/application-state; this only shows it.
 */
export function ApplyBox({
  state,
  now,
  locale,
  event,
  calendar,
  instagram,
  applyHref,
  idPrefix,
  className,
}: ApplyBoxProps) {
  const t = useTranslations('applications.box');
  const copy = useApplyCopy(locale);
  const badge = copy.badge(state, 'box');
  const target = countdownTarget(state);
  const external = state.via === 'external';
  const host = hostOf(state.externalUrl);
  const dateTime = (iso: string) => formatDate(iso, locale, 'dayDateTime');
  const day = (iso: string) => formatDate(iso, locale, 'dayMonth');
  const urgent = state.phase === 'deadline_soon';

  const countdownLabel =
    target?.kind === 'opens'
      ? t('opensIn')
      : external
        ? t('closesInExternal', { host })
        : urgent
          ? t('closesInUrgent')
          : t('closesIn');

  const message = (() => {
    switch (state.phase) {
      case 'closed':
        return [
          t('closedMessage', { date: formatDate(state.closedAt!, locale, 'date') }),
          state.resultsOn && state.resultsOn >= state.closedAt!.slice(0, 10)
            ? t('resultsMessage', { date: day(`${state.resultsOn}T12:00:00Z`) })
            : null,
        ]
          .filter(Boolean)
          .join(' ');
      case 'full_waitlist':
        return t('fullWaitlistMessage');
      case 'full':
        return t('fullMessage');
      case 'open':
      case 'deadline_soon':
        if (state.late) return t('lateMessage');
        if (!external) return null;
        return [
          event.organizer ? t('externalOrganizer', { organizer: event.organizer }) : null,
          t('externalHandled', { host, eestec: host === 'eestec.net' ? 'yes' : 'no' }),
        ]
          .filter(Boolean)
          .join(' ');
      case 'off':
      case 'opening_soon':
        return null;
    }
  })();

  const footnote: React.ReactNode = (() => {
    switch (state.phase) {
      case 'open':
      case 'deadline_soon': {
        if (external) return t('externalTip');
        const max = state.places?.max;
        return (
          [
            max ? t('places', { count: max }) : null,
            state.resultsOn
              ? t('results', { date: day(`${state.resultsOn}T12:00:00Z`) })
              : event.feePrice || null,
          ]
            .filter(Boolean)
            .join(' · ') || null
        );
      }
      case 'opening_soon':
        return instagram ? t('follow', { handle: instagram }) : null;
      case 'closed':
        return t.rich('missed', {
          link: (chunks) => (
            <Link href="/upcoming" className="font-medium text-brand-dark">
              {chunks}
            </Link>
          ),
        });
      case 'full_waitlist':
        return t('waitlistCloses', { date: formatDate(state.stopsAt, locale, 'date') });
      case 'full':
      case 'off':
        return null;
    }
  })();

  const button = (() => {
    switch (state.phase) {
      case 'open':
      case 'deadline_soon':
        return external ? (
          <Button asChild size="xl" block className="text-[17px]">
            <a href={state.externalUrl} target="_blank" rel="noopener noreferrer">
              {t('external', { host })}
              <ArrowUpRight aria-hidden />
              <span className="sr-only">{t('newTab')}</span>
            </a>
          </Button>
        ) : (
          <Button asChild size="xl" block className="text-[17px]">
            <a href={applyHref}>{t('apply')}</a>
          </Button>
        );
      case 'full_waitlist':
        return (
          <Button asChild variant="secondary" size="xl" block className="text-[17px]">
            <a href={applyHref}>{t('waitlist')}</a>
          </Button>
        );
      case 'full':
        return <DisabledButton>{t('full')}</DisabledButton>;
      case 'opening_soon':
        return <DisabledButton>{t('opens', { date: day(state.opensAt!) })}</DisabledButton>;
      case 'closed':
        return <DisabledButton>{t('closed')}</DisabledButton>;
      case 'off':
        return null;
    }
  })();

  return (
    <section
      aria-labelledby={`${idPrefix}-title`}
      className={cn(
        'flex flex-col gap-4.5 rounded-lg border border-line bg-white p-6 shadow-card',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${idPrefix}-title`} className="text-[18px] font-bold">
          {t('title')}
        </h2>
        {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
      </div>

      {target && (
        <div className="flex flex-col gap-2.5">
          <span className={cn('text-small font-medium', urgent ? 'text-brand-dark' : 'text-ink')}>
            {countdownLabel}
          </span>
          <Countdown
            target={target.to}
            now={now}
            variant="timer"
            urgent={urgent}
            neutral={target.kind === 'opens'}
            label={countdownLabel}
          />
          <span className="text-small text-muted-ink">
            {target.kind === 'opens'
              ? t('opensAt', { date: dateTime(target.to) })
              : t('deadline', { date: dateTime(target.to) })}
          </span>
        </div>
      )}

      {message && <p className="text-[15px] leading-[1.55]">{message}</p>}

      {(state.phase === 'full_waitlist' || state.phase === 'full') && state.places?.max !== null && (
        <PlacesBar
          id={`${idPrefix}-places`}
          taken={state.places!.taken}
          max={state.places!.max}
          waitlist={state.phase === 'full_waitlist' ? state.places!.waitlist : null}
        />
      )}

      <div className="flex flex-col gap-2.5">
        {button}
        <AddToCalendar links={calendar} />
      </div>

      {footnote && <p className="text-small leading-[1.5] text-muted-ink">{footnote}</p>}
    </section>
  );
}

function DisabledButton({ children }: { children: React.ReactNode }) {
  return (
    <Button size="xl" block disabled className="text-[17px]">
      {children}
    </Button>
  );
}

function PlacesBar({
  id,
  taken,
  max,
  waitlist,
}: {
  id: string;
  taken: number;
  max: number;
  waitlist: number | null;
}) {
  const t = useTranslations('applications.box');
  const value = Math.min(taken, max);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-small">
        <span className="font-medium" id={id}>
          {t('placesTaken')}
        </span>
        <span className="font-bold">{t('placesValue', { taken, max })}</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-2 overflow-hidden rounded-full bg-divider"
      >
        <span className="block h-full bg-brand" style={{ width: `${max ? (value / max) * 100 : 100}%` }} />
      </div>
      {waitlist !== null && (
        <span className="text-small text-muted-ink">{t('waitlistCount', { count: waitlist })}</span>
      )}
    </div>
  );
}
