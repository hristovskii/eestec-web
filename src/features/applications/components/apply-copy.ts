import { useTranslations } from 'next-intl';

import { dayInSkopje, formatDate } from '@/shared/i18n/format';
import type { Locale } from '@/shared/i18n/routing';
import { countdownParts } from '@/shared/lib/countdown';
import type { StatusTone } from '@/shared/ui/chip';

import type { ApplyState } from '../domain/application-state';

// The words of each application state (UpcomingStates, EventCard, ApplyBox), in one place so the
// card, the box, the Next-up card and the sticky bar always agree.

/** "eestec.net" from the external application link. */
export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export type CardLine = { text: string; tone: 'default' | 'urgent' | 'muted' };

export function useApplyCopy(locale: Locale) {
  const t = useTranslations('applications');

  const badge = (state: ApplyState, on: 'card' | 'box'): { tone: StatusTone; label: string } | null => {
    switch (state.phase) {
      case 'off':
        return null;
      case 'open':
        return { tone: 'open', label: t('badge.open') };
      case 'deadline_soon':
        return { tone: 'open', label: t('badge.closing') };
      case 'opening_soon':
        return { tone: 'soon', label: t('badge.soon') };
      case 'closed':
        return { tone: 'closed', label: t('badge.closed') };
      case 'full_waitlist':
        return { tone: 'dark', label: on === 'card' ? t('badge.fullWaitlist') : t('badge.full') };
      case 'full':
        return { tone: 'dark', label: t('badge.full') };
    }
  };

  /** The line with a clock on cards ("Applications close in 13 days", "Closed on 1 Oct"). */
  const cardLine = (state: ApplyState, now: string): CardLine | null => {
    const left = countdownParts(new Date(state.closesAt), new Date(now));
    const day = (iso: string) => formatDate(iso, locale, 'dayMonth');
    switch (state.phase) {
      case 'off':
        return null;
      case 'open':
        if (state.late) return { text: t('card.late'), tone: 'default' };
        return {
          text:
            left.days > 0
              ? t('card.closesIn', { days: left.days })
              : t('card.closesInHours', { hours: left.hours }),
          tone: 'default',
        };
      case 'deadline_soon':
        return {
          text:
            left.days === 0 && left.hours === 0
              ? t('card.closingMinutes', { minutes: left.minutes })
              : t('card.closing', { days: left.days, hours: left.hours }),
          tone: 'urgent',
        };
      case 'opening_soon': {
        const date = day(state.opensAt!);
        return {
          text:
            state.via === 'external'
              ? t('card.opensExternal', { date, host: hostOf(state.externalUrl) })
              : t('card.opens', { date }),
          tone: 'default',
        };
      }
      case 'closed': {
        const date = day(state.closedAt!);
        const selecting = !!state.resultsOn && dayInSkopje(now) <= state.resultsOn;
        return {
          text: selecting ? t('card.closedSelection', { date }) : t('card.closed', { date }),
          tone: 'muted',
        };
      }
      case 'full_waitlist':
      case 'full': {
        const places = state.places!;
        const values = { taken: places.taken, max: places.max ?? places.taken, waitlist: places.waitlist };
        return {
          text: state.phase === 'full_waitlist' ? t('card.placesWaitlist', values) : t('card.places', values),
          tone: 'default',
        };
      }
    }
  };

  const cardCta = (state: ApplyState) =>
    state.phase === 'full_waitlist'
      ? t('card.ctaWaitlist')
      : state.canApply
        ? t('card.ctaApply')
        : t('card.ctaView');

  return { badge, cardLine, cardCta };
}
