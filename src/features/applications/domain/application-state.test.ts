import { describe, expect, it } from 'vitest';

import type { EventApplicationSettings } from '@/features/events';

import { applicationState, countdownTarget } from './application-state';

const settings = { deadlineSoonHours: 72, autoCloseApplications: true };
const applications = (patch: Partial<EventApplicationSettings> = {}): EventApplicationSettings => ({
  enabled: true,
  via: 'form',
  externalUrl: '',
  opensAt: '2026-10-01T00:00:00+02:00',
  deadline: '2026-10-18T23:59:00+02:00',
  resultsOn: '2026-10-25',
  maxParticipants: 24,
  waitlist: true,
  ...patch,
});
const event = (patch: Partial<EventApplicationSettings> = {}, startsAt = '2026-11-07T10:00:00+01:00') => ({
  startsAt,
  applications: applications(patch),
});
const at = (iso: string) => new Date(iso);
const free = { taken: 0, waitlist: 0 };
const phase = (...args: Parameters<typeof applicationState>) => applicationState(...args).phase;

describe('applicationState', () => {
  it('is off when the event takes no applications', () => {
    const state = applicationState(event({ enabled: false }), at('2026-10-04T18:18+02:00'), settings, free);
    expect(state.phase).toBe('off');
    expect(state.canApply).toBe(false);
    expect(state.places).toBeNull();
  });

  it('opens at the open date', () => {
    const e = event({ opensAt: '2026-10-15T12:00:00+02:00' });
    expect(phase(e, at('2026-10-15T11:59:59+02:00'), settings, free)).toBe('opening_soon');
    expect(phase(e, at('2026-10-15T12:00:00+02:00'), settings, free)).toBe('open');
    expect(applicationState(e, at('2026-10-04T18:18+02:00'), settings, free).canApply).toBe(false);
  });

  it('is "closing soon" for the last 72 hours (Settings › Events)', () => {
    const e = event();
    expect(phase(e, at('2026-10-15T23:58:59+02:00'), settings, free)).toBe('open');
    expect(phase(e, at('2026-10-15T23:59:00+02:00'), settings, free)).toBe('deadline_soon');
    expect(phase(e, at('2026-10-15T23:59:00+02:00'), { ...settings, deadlineSoonHours: 24 }, free)).toBe(
      'open',
    );
  });

  it('closes at the deadline', () => {
    const e = event();
    const before = applicationState(e, at('2026-10-18T23:58:59+02:00'), settings, free);
    expect(before.phase).toBe('deadline_soon');
    expect(before.canApply).toBe(true);
    const after = applicationState(e, at('2026-10-18T23:59:00+02:00'), settings, free);
    expect(after.phase).toBe('closed');
    expect(after.closedAt).toBe('2026-10-18T21:59:00.000Z');
    expect(after.canApply).toBe(false);
  });

  it('keeps accepting after the deadline when auto-close is off, until the event starts', () => {
    const lenient = { ...settings, autoCloseApplications: false };
    const late = applicationState(event(), at('2026-10-20T10:00+02:00'), lenient, free);
    expect(late).toMatchObject({
      phase: 'open',
      late: true,
      canApply: true,
      stopsAt: '2026-11-07T09:00:00.000Z',
    });
    expect(countdownTarget(late)).toBeNull();
    expect(phase(event(), at('2026-11-07T10:00+01:00'), lenient, free)).toBe('closed');
  });

  it('closes when the event starts if there is no deadline', () => {
    const e = event({ deadline: null, opensAt: null });
    const state = applicationState(e, at('2026-11-07T09:59+01:00'), settings, free);
    expect(state.phase).toBe('deadline_soon');
    expect(state.closesAt).toBe('2026-11-07T10:00:00+01:00');
    expect(phase(e, at('2026-11-07T10:00+01:00'), settings, free)).toBe('closed');
  });

  it('is full when the accepted applications fill the places, with or without a waitlist', () => {
    const now = at('2026-10-04T18:18+02:00');
    const e = event({ maxParticipants: 20 });
    expect(phase(e, now, settings, { taken: 19, waitlist: 0 })).toBe('open');
    const full = applicationState(e, now, settings, { taken: 20, waitlist: 7 });
    expect(full).toMatchObject({
      phase: 'full_waitlist',
      canApply: true,
      places: { max: 20, taken: 20, waitlist: 7 },
    });
    const closed = applicationState(event({ maxParticipants: 20, waitlist: false }), now, settings, {
      taken: 20,
      waitlist: 0,
    });
    expect(closed).toMatchObject({ phase: 'full', canApply: false });
    // No limit: never full.
    expect(phase(event({ maxParticipants: null }), now, settings, { taken: 500, waitlist: 0 })).toBe('open');
  });

  it('follows the same dates for external applications, which are never full and never use the form', () => {
    const e = event({ via: 'external', externalUrl: 'https://eestec.net', maxParticipants: 1 });
    const state = applicationState(e, at('2026-10-04T18:18+02:00'), settings, { taken: 5, waitlist: 0 });
    expect(state).toMatchObject({ phase: 'open', canApply: false, places: null });
    expect(phase(e, at('2026-10-19T00:00+02:00'), settings, free)).toBe('closed');
  });

  it('counts down to the opening or the deadline', () => {
    const soon = applicationState(
      event({ opensAt: '2026-10-15T12:00:00+02:00' }),
      at('2026-10-04T18:18+02:00'),
      settings,
      free,
    );
    expect(countdownTarget(soon)).toEqual({ to: '2026-10-15T12:00:00+02:00', kind: 'opens' });
    const open = applicationState(event(), at('2026-10-04T18:18+02:00'), settings, free);
    expect(countdownTarget(open)).toEqual({ to: '2026-10-18T23:59:00+02:00', kind: 'closes' });
    const closed = applicationState(event(), at('2026-10-30T00:00+01:00'), settings, free);
    expect(countdownTarget(closed)).toBeNull();
  });
});
