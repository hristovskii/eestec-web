// Date and time fields in the admin are Skopje wall-clock time ("Sat, 7 Nov 2026", "10:00");
// the data layer stores ISO instants with their offset. These convert between the two without a
// date library (Intl knows the Europe/Skopje rules, incl. summer time).

export const SKOPJE = 'Europe/Skopje';

/** Offset of Skopje at `instant`, e.g. "+01:00" or "+02:00". */
function offsetAt(instant: Date): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: SKOPJE, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName')?.value;
  const match = /GMT([+-]\d{2}):?(\d{2})?/.exec(part ?? '');
  return match ? `${match[1]}:${match[2] ?? '00'}` : '+00:00';
}

/** "2026-11-07" + "10:00" (Skopje) → "2026-11-07T10:00:00+01:00". null when either is invalid. */
export function zonedToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  // Guess with the offset at that UTC moment, then correct once (DST changes near the guess).
  const guess = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(guess.getTime())) return null;
  let offset = offsetAt(guess);
  const corrected = offsetAt(new Date(`${date}T${time}:00${offset}`));
  if (corrected !== offset) offset = corrected;
  return `${date}T${time}:00${offset}`;
}

/** ISO instant → Skopje { date: "2026-11-07", time: "10:00" }. */
export function isoToZoned(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SKOPJE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}
