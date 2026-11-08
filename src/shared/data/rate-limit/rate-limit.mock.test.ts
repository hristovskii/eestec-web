import { describe, expect, it } from 'vitest';

import { RATE_LIMIT } from './rate-limit';
import { createMockRateLimiter } from './rate-limit.mock';

const T0 = new Date('2026-10-04T18:00:00.000Z');
const later = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

describe('mock rate limiter', () => {
  it('lets five attempts of a device through and stops the sixth, telling when to try again', async () => {
    const limiter = createMockRateLimiter();
    const key = `device-${crypto.randomUUID()}`;
    for (let i = 0; i < RATE_LIMIT.perHour; i += 1) {
      expect(await limiter.hit(key, later(i))).toEqual({
        allowed: true,
        remaining: RATE_LIMIT.perHour - i - 1,
      });
    }
    expect(await limiter.hit(key, later(10))).toEqual({
      allowed: false,
      retryAt: later(60).toISOString(),
    });
  });

  it('does not count the refused attempt, and frees a place when the oldest one is an hour old', async () => {
    const limiter = createMockRateLimiter();
    const key = `device-${crypto.randomUUID()}`;
    for (let i = 0; i < RATE_LIMIT.perHour; i += 1) await limiter.hit(key, later(i));
    await limiter.hit(key, later(20));
    expect((await limiter.hit(key, later(60))).allowed).toBe(true);
    expect((await limiter.hit(key, later(60))).allowed).toBe(false);
  });

  it('counts every device on its own', async () => {
    const limiter = createMockRateLimiter();
    const a = `device-${crypto.randomUUID()}`;
    for (let i = 0; i < RATE_LIMIT.perHour; i += 1) await limiter.hit(a, T0);
    expect((await limiter.hit(`device-${crypto.randomUUID()}`, T0)).allowed).toBe(true);
  });
});
