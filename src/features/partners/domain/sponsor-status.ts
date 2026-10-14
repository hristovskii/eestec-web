import type { Sponsor } from '../types';

/**
 * Where a sponsor shows (data-model.md: "active_to in the past → Past partners"):
 * - active: on Home and /partners
 * - past: "Past partners" on /partners
 * - scheduled: its "active from" date has not come yet, so it is hidden for now
 * - inactive: switched off by the board, hidden everywhere
 */
export type SponsorStatus = 'active' | 'past' | 'scheduled' | 'inactive';

/** `today` is a Skopje date, "2026-10-14"; dates are "YYYY-MM-DD", so string order is date order. */
export function sponsorStatus(
  sponsor: Pick<Sponsor, 'isActive' | 'activeFrom' | 'activeTo'>,
  today: string,
): SponsorStatus {
  if (!sponsor.isActive) return 'inactive';
  if (sponsor.activeTo && sponsor.activeTo < today) return 'past';
  if (sponsor.activeFrom && sponsor.activeFrom > today) return 'scheduled';
  return 'active';
}

/** "2018–2022"; with no start only the end year; empty when there is no end. */
export function pastYears(sponsor: Pick<Sponsor, 'activeFrom' | 'activeTo'>): string {
  const to = sponsor.activeTo.slice(0, 4);
  const from = sponsor.activeFrom.slice(0, 4);
  if (!to) return '';
  return from && from !== to ? `${from}–${to}` : to;
}
