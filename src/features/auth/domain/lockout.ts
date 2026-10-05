/** Decided: 5 failed sign-ins pause sign-in for 15 minutes (Settings › Security, D-rules). */
export const LOCKOUT = { attempts: 5, minutes: 15 } as const;

export type AttemptLog = { failures: number[]; lockedUntil: number | null };

export const emptyLog = (): AttemptLog => ({ failures: [], lockedUntil: null });

/** Lock state at `now`. Failures older than the lockout window no longer count. */
export function lockState(
  log: AttemptLog,
  now: Date,
): { locked: boolean; until: Date | null; attemptsLeft: number } {
  const t = now.getTime();
  if (log.lockedUntil !== null && log.lockedUntil > t) {
    return { locked: true, until: new Date(log.lockedUntil), attemptsLeft: 0 };
  }
  const windowStart = t - LOCKOUT.minutes * 60_000;
  const recent = log.failures.filter((at) => at > windowStart).length;
  return { locked: false, until: null, attemptsLeft: Math.max(0, LOCKOUT.attempts - recent) };
}

/** Records a failed attempt; the 5th failure starts the 15-minute pause. */
export function recordFailure(log: AttemptLog, now: Date): AttemptLog {
  const t = now.getTime();
  const windowStart = t - LOCKOUT.minutes * 60_000;
  const failures = [...log.failures.filter((at) => at > windowStart), t];
  const lockedUntil = failures.length >= LOCKOUT.attempts ? t + LOCKOUT.minutes * 60_000 : null;
  return { failures: lockedUntil ? [] : failures, lockedUntil };
}
