import { dayInSkopje, TIME_ZONE } from '@/shared/i18n/format';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type MeetingDay = (typeof DAYS)[number];

/** The instant of "YYYY-MM-DD HH:MM" in Skopje (+02:00 in summer, +01:00 in winter). */
function skopjeInstant(day: string, time: string): Date {
  for (const offset of ['+02:00', '+01:00']) {
    const date = new Date(`${day}T${time}:00${offset}`);
    if (dayInSkopje(date) === day) {
      const shown = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: TIME_ZONE,
      }).format(date);
      if (shown === time) return date;
    }
  }
  return new Date(`${day}T${time}:00+01:00`);
}

/**
 * The next time a weekly meeting happens, from `now` (Skopje time): today if its time has not
 * passed yet, otherwise on the next such weekday. `time` is "HH:MM".
 */
export function nextMeetingAt(meeting: { day: MeetingDay; time: string }, now: Date): Date {
  const today = dayInSkopje(now);
  for (let ahead = 0; ahead <= 7; ahead++) {
    const [year, month, date] = today.split('-').map(Number) as [number, number, number];
    const candidate = new Date(Date.UTC(year, month - 1, date + ahead));
    if (DAYS[candidate.getUTCDay()] !== meeting.day) continue;
    const at = skopjeInstant(candidate.toISOString().slice(0, 10), meeting.time);
    if (at.getTime() > now.getTime()) return at;
  }
  return skopjeInstant(today, meeting.time);
}
