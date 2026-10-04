import { describe, expect, it } from 'vitest';

import { CANVAS_NOW, resolveNow } from './clock';

describe('resolveNow', () => {
  it('pins mock data to the canvas moment by default', () => {
    expect(resolveNow(undefined, true).toISOString()).toBe(new Date(CANVAS_NOW).toISOString());
  });

  it('accepts an explicit ISO override', () => {
    expect(resolveNow('2026-11-20T10:00:00Z', true).toISOString()).toBe('2026-11-20T10:00:00.000Z');
  });

  it('uses the real clock for MOCK_NOW=real and for real data', () => {
    const before = Date.now();
    expect(resolveNow('real', true).getTime()).toBeGreaterThanOrEqual(before);
    expect(resolveNow('2020-01-01T00:00:00Z', false).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('rejects an invalid date', () => {
    expect(() => resolveNow('not-a-date', true)).toThrow(/MOCK_NOW/);
  });
});
