import { randomBytes } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { serviceClient } from '../../../../tests/supabase/harness';
import { RATE_LIMIT } from './rate-limit';
import { createSupabaseRateLimiter } from './rate-limit.supabase';

const key = randomBytes(32).toString('hex');
const NOW = new Date('2026-10-04T16:18:00Z');

describe('supabase rate limiter', () => {
  afterAll(async () => {
    await serviceClient().from('submission_log').delete().eq('device_hash', key);
  });

  it('lets five attempts through and blocks the sixth with a retry time', async () => {
    const limiter = createSupabaseRateLimiter(serviceClient());
    for (let attempt = 1; attempt <= RATE_LIMIT.perHour; attempt += 1) {
      const result = await limiter.hit(key, NOW);
      expect(result).toEqual({ allowed: true, remaining: RATE_LIMIT.perHour - attempt });
    }
    const blocked = await limiter.hit(key, NOW);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(new Date(blocked.retryAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('does not record a blocked attempt', async () => {
    const { count } = await serviceClient()
      .from('submission_log')
      .select('*', { count: 'exact', head: true })
      .eq('device_hash', key);
    expect(count).toBe(RATE_LIMIT.perHour);
  });
});
