import 'server-only';

import { serviceClient } from '../supabase/clients';
import { selectImplementation } from '../select-implementation';
import { createMockRateLimiter } from './rate-limit.mock';
import { createSupabaseRateLimiter } from './rate-limit.supabase';
import type { RateLimiter } from './rate-limit';

export { deviceKey } from './device-key';
export { RATE_LIMIT, type RateLimiter, type RateLimitResult } from './rate-limit';

/** Service scope: the limit is checked by Server Actions, never by a visitor's own session (D32). */
export const rateLimiter = () =>
  selectImplementation<RateLimiter>(
    'rate-limit',
    { mock: createMockRateLimiter, supabase: () => createSupabaseRateLimiter(serviceClient()) },
    'service',
  );
