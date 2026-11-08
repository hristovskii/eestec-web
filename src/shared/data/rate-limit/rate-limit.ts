/**
 * The limit on /submit: 5 submissions per hour per device (docs/ARCHITECTURE.md D28). Both tabs of
 * the form share it. Only attempts that passed the spam guard count, and only a hash of the device
 * is kept, for one hour. Supabase (later) keeps the same shape in `submission_log` (`ip_hash`).
 */
export const RATE_LIMIT = { perHour: 5, windowMs: 60 * 60 * 1000 } as const;

export type RateLimitResult =
  | { allowed: true; remaining: number }
  /** `retryAt`: when the oldest counted attempt leaves the window (ISO). Nothing is recorded. */
  | { allowed: false; retryAt: string };

export interface RateLimiter {
  /** Counts one attempt of `key` at `now` and says whether it may go ahead. */
  hit(key: string, now: Date): Promise<RateLimitResult>;
}
