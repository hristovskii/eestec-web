export type RelativeAge = { count: number; unit: 'day' | 'month' | 'year' };

/**
 * How long ago `from` was, as `to` sees it: days under a month ("12 days ago"), months under a year
 * ("4 months ago"), then years. Worked out where the time is known (the server), so what is drawn
 * does not change between the server's page and the browser's.
 */
export function relativeAge(from: string, to: string): RelativeAge {
  const days = Math.max(0, Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000));
  if (days < 30) return { count: days, unit: 'day' };
  const months = Math.floor(days / 30.4375);
  if (months < 12) return { count: months, unit: 'month' };
  return { count: Math.floor(days / 365.25), unit: 'year' };
}
