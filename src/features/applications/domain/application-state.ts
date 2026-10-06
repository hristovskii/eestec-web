import type { EventApplicationSettings } from '@/features/events';

import type { Availability } from '../types';

// The state of an event's applications (ApplyBox, UpcomingStates, card badges), set automatically
// from the open date, the deadline and the places (decided rules). Pure, so every boundary is
// unit-tested; the pages compute it in cached queries (refreshed at least every 10 minutes) and
// the submit action computes it again before saving.

/**
 * off: the event takes no applications. full_waitlist / full: every place is taken, with or
 * without a waitlist (D11). External events (eestec.net) go through the same phases, except full.
 */
export type ApplyPhase =
  'off' | 'opening_soon' | 'open' | 'deadline_soon' | 'closed' | 'full_waitlist' | 'full';

export type ApplyState = {
  phase: ApplyPhase;
  via: EventApplicationSettings['via'];
  externalUrl: string;
  opensAt: string | null;
  /** The published deadline; without one, applications close when the event starts. */
  closesAt: string;
  /** When the form stops taking applications: the deadline, or the start without auto-close. */
  stopsAt: string;
  /** Set once that moment has passed (phase closed). */
  closedAt: string | null;
  /** The deadline has passed but Settings › Events "Auto-close" is off: still accepting. */
  late: boolean;
  /** "Results by 25 Oct" (YYYY-MM-DD). */
  resultsOn: string | null;
  admission: EventApplicationSettings['admission'];
  /** Internal form only: places and the waitlist. */
  places: { max: number | null; taken: number; waitlist: number } | null;
  /** The application form takes submissions right now (open, closing soon, or the waitlist). */
  canApply: boolean;
};

export type ApplySettings = { deadlineSoonHours: number; autoCloseApplications: boolean };

const HOUR_MS = 60 * 60 * 1000;

export function applicationState(
  event: { startsAt: string; applications: EventApplicationSettings },
  now: Date,
  settings: ApplySettings,
  availability: Availability | null,
): ApplyState {
  const { applications } = event;
  const external = applications.via === 'external';
  const closesAt = applications.deadline ?? event.startsAt;
  const start = Date.parse(event.startsAt);
  const deadline = Date.parse(closesAt);
  // Nothing is accepted once the event has started.
  const closedAtMs = settings.autoCloseApplications ? Math.min(deadline, start) : start;
  const time = now.getTime();

  const base = {
    via: applications.via,
    externalUrl: applications.externalUrl,
    opensAt: applications.opensAt,
    closesAt,
    stopsAt: new Date(closedAtMs).toISOString(),
    closedAt: null,
    late: false,
    resultsOn: applications.resultsOn,
    admission: applications.admission,
    places: external
      ? null
      : {
          max: applications.maxParticipants,
          taken: availability?.taken ?? 0,
          waitlist: availability?.waitlist ?? 0,
        },
    canApply: false,
  } satisfies Omit<ApplyState, 'phase'>;

  if (!applications.enabled) return { ...base, phase: 'off', places: null };
  if (time >= closedAtMs) return { ...base, phase: 'closed', closedAt: new Date(closedAtMs).toISOString() };
  if (applications.opensAt && time < Date.parse(applications.opensAt))
    return { ...base, phase: 'opening_soon' };

  const places = base.places;
  // First come: while anyone is waiting, newcomers queue behind them (D22).
  const queue =
    applications.admission === 'first_come' && applications.waitlist && (places?.waitlist ?? 0) > 0;
  if (places && ((places.max !== null && places.taken >= places.max) || queue)) {
    return applications.waitlist
      ? { ...base, phase: 'full_waitlist', canApply: true }
      : { ...base, phase: 'full' };
  }
  const late = time >= deadline;
  const soon = !late && deadline - time <= settings.deadlineSoonHours * HOUR_MS;
  return { ...base, phase: soon ? 'deadline_soon' : 'open', late, canApply: !external };
}

/** Phases that show a countdown to `closesAt` (open, closing soon) or to `opensAt` (opening soon). */
export function countdownTarget(state: ApplyState): { to: string; kind: 'opens' | 'closes' } | null {
  if (state.phase === 'opening_soon' && state.opensAt) return { to: state.opensAt, kind: 'opens' };
  if ((state.phase === 'open' || state.phase === 'deadline_soon') && !state.late)
    return { to: state.closesAt, kind: 'closes' };
  return null;
}
