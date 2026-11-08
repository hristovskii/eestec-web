import 'server-only';

import { selectImplementation } from '../select-implementation';
import { createMockRateLimiter } from './rate-limit.mock';
import type { RateLimiter } from './rate-limit';

export { deviceKey } from './device-key';
export { RATE_LIMIT, type RateLimiter, type RateLimitResult } from './rate-limit';

export const rateLimiter = () =>
  selectImplementation<RateLimiter>('rate-limit', { mock: createMockRateLimiter });
