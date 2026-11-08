import type { ActionResult } from '@/shared/forms/action-result';

import type { PasswordCheck } from '../types';

// Not in a 'use server' file: those may only export async functions.

const retryAt = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

/** Maps a failed password check to what the form shows. */
export function passwordFailure(
  check: Exclude<PasswordCheck, { status: 'ok' }>,
  field: string,
): ActionResult<never> {
  return check.status === 'locked'
    ? { ok: false, error: 'rate_limited', retryAt: retryAt(check.minutes) }
    : { ok: false, error: 'validation', fieldErrors: { [field]: ['currentWrong'] } };
}
