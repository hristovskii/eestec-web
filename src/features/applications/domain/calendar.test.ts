import { describe, expect, it } from 'vitest';

import { googleCalendarUrl, toIcs } from './calendar';
import { formatReference, referencePrefix } from './reference';

const workshop = {
  id: 'ev-ai-at-the-edge',
  title: 'Workshop: AI at the Edge',
  startsAt: '2026-11-07T10:00:00+01:00',
  endsAt: '2026-11-13T14:00:00+01:00',
  allDay: false,
  location: 'Skopje & Ohrid, North Macedonia',
  description: 'A week of building\; deploying, testing',
  url: 'https://eestec.mk/en/upcoming/ai-at-the-edge',
};
const allDay = {
  ...workshop,
  startsAt: '2026-11-21T00:00:00+01:00',
  endsAt: '2026-11-22T23:59:00+01:00',
  allDay: true,
};

describe('calendar', () => {
  it('links to Google Calendar with UTC times, or dates for all-day events', () => {
    const url = new URL(googleCalendarUrl(workshop));
    expect(url.searchParams.get('dates')).toBe('20261107T090000Z/20261113T130000Z');
    expect(url.searchParams.get('text')).toBe('Workshop: AI at the Edge');
    expect(url.searchParams.get('details')).toContain('https://eestec.mk/en/upcoming/ai-at-the-edge');
    expect(new URL(googleCalendarUrl(allDay)).searchParams.get('dates')).toBe('20261121/20261123');
  });

  it('writes an .ics file with escaped, folded lines', () => {
    const ics = toIcs(workshop, { stamp: new Date('2026-10-04T16:18:00Z'), host: 'eestec.mk' });
    expect(ics).toContain('UID:ev-ai-at-the-edge@eestec.mk\r\n');
    expect(ics).toContain('DTSTART:20261107T090000Z\r\n');
    expect(ics).toContain('DTSTAMP:20261004T161800Z\r\n');
    expect(ics).toContain('LOCATION:Skopje & Ohrid\\, North Macedonia\r\n');
    expect(ics).toContain(
      'DESCRIPTION:A week of building\\; deploying\\, testing\\n\\nhttps://eestec.mk/e\r\n n/upcoming/ai-at-the-edge',
    );
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
    expect(toIcs(allDay, { stamp: new Date(), host: 'eestec.mk' })).toContain(
      'DTSTART;VALUE=DATE:20261121\r\nDTEND;VALUE=DATE:20261123\r\n',
    );
  });
});

describe('references', () => {
  it('uses three letters of the address, the event year and a running number', () => {
    expect(referencePrefix('ai-at-the-edge')).toBe('AIE');
    expect(referencePrefix('leading-teams')).toBe('LEA');
    expect(referencePrefix('a-b')).toBe('BXX');
    expect(formatReference('AIE', '2026-11-07T10:00:00+01:00', 42)).toBe('AIE-2026-0042');
  });
});
