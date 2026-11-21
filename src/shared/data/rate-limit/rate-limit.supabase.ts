import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import { unwrap } from '@/shared/data/supabase/errors';

import type { RateLimiter } from './rate-limit';

/**
 * `rate_limit_hit` counts in the database (an advisory lock per device, so simultaneous hits cannot
 * pass the limit together) and uses the database clock, so the caller's `now` is not needed.
 */
export function createSupabaseRateLimiter(client: DbClient): RateLimiter {
  return {
    async hit(key) {
      const result = unwrap(await client.rpc('rate_limit_hit', { p_device_hash: key })) as {
        allowed: boolean;
        remaining?: number;
        retryAt?: string;
      };
      return result.allowed
        ? { allowed: true, remaining: result.remaining ?? 0 }
        : { allowed: false, retryAt: result.retryAt ?? new Date().toISOString() };
    },
  };
}
