export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number; done: boolean };

/** Splits the time left until `target` into days / hours / minutes / seconds (never negative). */
export function countdownParts(target: Date, now: Date): CountdownParts {
  const ms = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    done: ms === 0,
  };
}
