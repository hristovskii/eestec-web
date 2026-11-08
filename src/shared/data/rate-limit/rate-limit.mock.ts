import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import { RATE_LIMIT, type RateLimiter } from './rate-limit';

const tables = () => mockTable<{ hits: Record<string, number[]> }>('rate-limit', () => ({ hits: {} }));

export function createMockRateLimiter(): RateLimiter {
  const db = tables();
  return {
    hit(key, now) {
      const t = now.getTime();
      // Older attempts left the window; the rest is what counts.
      const recent = (db.hits[key] ?? []).filter((at) => t - at < RATE_LIMIT.windowMs);
      if (recent.length >= RATE_LIMIT.perHour) {
        db.hits[key] = recent;
        return Promise.resolve({
          allowed: false,
          retryAt: new Date((recent[0] ?? t) + RATE_LIMIT.windowMs).toISOString(),
        });
      }
      db.hits[key] = [...recent, t];
      return Promise.resolve({ allowed: true, remaining: RATE_LIMIT.perHour - recent.length - 1 });
    },
  };
}
