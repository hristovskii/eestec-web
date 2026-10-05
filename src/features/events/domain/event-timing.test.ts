import { describe, expect, it } from 'vitest';

import { eventPath, eventTiming, justEnded } from './event-timing';

const event = { slug: 'ai-at-the-edge', endsAt: '2026-11-13T14:00:00+01:00' };

describe('eventTiming', () => {
  it('is upcoming until the end date-time, then past', () => {
    expect(eventTiming(event, new Date('2026-11-13T13:59:59+01:00'))).toBe('upcoming');
    expect(eventTiming(event, new Date('2026-11-13T14:00:00+01:00'))).toBe('upcoming');
    expect(eventTiming(event, new Date('2026-11-13T14:00:01+01:00'))).toBe('past');
  });

  it('gives the public path for the moment', () => {
    expect(eventPath(event, new Date('2026-10-04T18:18:00+02:00'))).toBe('/upcoming/ai-at-the-edge');
    expect(eventPath(event, new Date('2026-12-01T00:00:00+01:00'))).toBe('/events/ai-at-the-edge');
  });
});

describe('justEnded', () => {
  it('lasts the set number of days after the end', () => {
    expect(justEnded(event, new Date('2026-11-13T13:00:00+01:00'), 14)).toBe(false);
    expect(justEnded(event, new Date('2026-11-13T15:00:00+01:00'), 14)).toBe(true);
    expect(justEnded(event, new Date('2026-11-27T14:00:00+01:00'), 14)).toBe(true);
    expect(justEnded(event, new Date('2026-11-27T14:00:01+01:00'), 14)).toBe(false);
  });
});
