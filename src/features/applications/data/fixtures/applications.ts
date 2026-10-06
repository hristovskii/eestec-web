// SAMPLE DATA — applications behind the counts on the canvas (AdminEvents, AdminDashboard,
// AdminMobile, ApplyBox, UpcomingList). The canvas gives only numbers, never applicants, so the
// rows are placeholders ("Sample applicant 07", example.com addresses) with no answers:
// - AI at the Edge: 38 applications, all pending (selection after the deadline, results 25 Oct).
// - Leading Teams: 23 pending.
// - FPGA Basics: "20 / 20 places · 7 on the waitlist" = 20 accepted + 7 on the waitlist.
// - Soft Skills Academy 2026 (past): 41, still pending (the canvas gives no outcome).
// - Power Up (past): 64, of which the 24 participants (EventDetail) were accepted.
// - "New" (not opened in the admin yet): 6 for AI at the Edge and 4 for Leading Teams, the latest
//   ones (AdminDashboard: "10 new", 6 + 4 + 0).
// The form of AI at the Edge is the one on UpcomingDetail (= the default fields); other events use
// the default fields too.
import { DEFAULT_APPLICATION_FIELDS, DEFAULT_FORM_INTRO } from '../../domain/default-form';
import { formatReference } from '../../domain/reference';
import type { Application, ApplicationForm, ApplicationStatus } from '../../types';

export const applicationFormsFixture: ApplicationForm[] = [
  { eventId: 'ev-ai-at-the-edge', intro: DEFAULT_FORM_INTRO, fields: DEFAULT_APPLICATION_FIELDS },
];

type Batch = {
  eventId: string;
  prefix: string;
  startsAt: string;
  /** First and last submission (spread evenly in between). */
  from: string;
  to: string;
  statuses: [ApplicationStatus, number][];
  /** The latest ones are still unread. */
  unread?: number;
};

const batches: Batch[] = [
  {
    eventId: 'ev-ai-at-the-edge',
    prefix: 'AIE',
    startsAt: '2026-11-07T10:00:00+01:00',
    from: '2026-10-01T09:00:00+02:00',
    to: '2026-10-04T17:40:00+02:00',
    statuses: [['pending', 38]],
    unread: 6,
  },
  {
    eventId: 'ev-leading-teams',
    prefix: 'LEA',
    startsAt: '2026-11-14T00:00:00+01:00',
    from: '2026-09-25T10:00:00+02:00',
    to: '2026-10-04T15:10:00+02:00',
    statuses: [['pending', 23]],
    unread: 4,
  },
  {
    eventId: 'ev-fpga-basics',
    prefix: 'FPG',
    startsAt: '2026-11-21T00:00:00+01:00',
    from: '2026-09-20T10:00:00+02:00',
    to: '2026-10-03T21:00:00+02:00',
    statuses: [
      ['accepted', 20],
      ['waitlist', 7],
    ],
  },
  {
    eventId: 'ev-soft-skills-academy-2026',
    prefix: 'SOF',
    startsAt: '2026-09-12T00:00:00+02:00',
    from: '2026-08-15T10:00:00+02:00',
    to: '2026-09-05T20:00:00+02:00',
    statuses: [['pending', 41]],
  },
  {
    eventId: 'ev-power-up-2026',
    prefix: 'POW',
    startsAt: '2026-05-18T10:00:00+02:00',
    from: '2026-03-20T10:00:00+01:00',
    to: '2026-04-20T20:00:00+02:00',
    statuses: [
      ['accepted', 24],
      ['rejected', 40],
    ],
  },
];

function rows(batch: Batch): Application[] {
  const total = batch.statuses.reduce((sum, [, count]) => sum + count, 0);
  const from = Date.parse(batch.from);
  const step = total > 1 ? (Date.parse(batch.to) - from) / (total - 1) : 0;
  const statuses = batch.statuses.flatMap(([status, count]) => Array<ApplicationStatus>(count).fill(status));
  let waitlisted = 0;
  return statuses.map((status, index) => {
    const number = String(index + 1).padStart(2, '0');
    const createdAt = new Date(from + Math.round(step * index)).toISOString();
    return {
      id: `app-${batch.prefix.toLowerCase()}-${number}`,
      eventId: batch.eventId,
      reference: formatReference(batch.prefix, batch.startsAt, index + 1),
      name: `Sample applicant ${number}`,
      email: `applicant${number}.${batch.prefix.toLowerCase()}@example.com`,
      answers: {},
      status,
      waitlistPosition: status === 'waitlist' ? ++waitlisted : null,
      locale: 'mk',
      consentAt: createdAt,
      createdAt,
      readAt: index >= total - (batch.unread ?? 0) ? null : createdAt,
    };
  });
}

export const applicationsFixture: Application[] = batches.flatMap(rows);
