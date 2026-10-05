// SAMPLE DATA — handoff/design-source/AdminDashboard.dc.html (counters, pending approvals, activity,
// applications for open events), relative to the canvas moment 2026-10-04 18:18 Europe/Skopje.
// Each part is replaced by real aggregation when its feature lands (inbox M10–M12, approvals M14/M17,
// ideas M18, applications M7, activity M4). Counts are consistent with each other, so they differ
// from the illustrative canvas numbers (e.g. Approvals 7 = 3 registrations + 4 Memories, D2).
import type { DashboardData } from '../../types';

export const dashboardFixture: DashboardData = {
  counters: {
    memberRegistrations: { count: 3, oldestAt: '2026-10-02T17:00:00+02:00' },
    memoriesToApprove: { count: 4, oldestAt: '2026-10-04T13:10:00+02:00' },
    ideas: { newIdeas: 5, newFeedback: 4 },
    membershipApplications: { count: 12 },
    messages: { contact: 5, partners: 2 },
    openEventApplications: { total: 88, newCount: 10, events: 3 },
  },
  pending: [
    {
      id: 'pa-1',
      type: 'memory',
      title: 'Seven days, 28 nationalities and one very long bus ride to Ohrid',
      meta: 'Marija Stojanovska',
      submittedAt: '2026-10-04T13:10:00+02:00',
    },
    {
      id: 'pa-2',
      type: 'member',
      title: 'Daniel Ristov',
      meta: 'FEEIT, 2nd year',
      submittedAt: '2026-10-02T17:00:00+02:00',
    },
    {
      id: 'pa-3',
      type: 'memory',
      title: 'Power Up: the lab day (from an impression)',
      meta: 'Marija Stojanovska',
      submittedAt: '2026-10-04T09:30:00+02:00',
    },
    {
      id: 'pa-4',
      type: 'memory',
      title: 'My first exchange: Delft by bike',
      meta: 'Stefan Nikolovski',
      submittedAt: '2026-10-03T20:05:00+02:00',
    },
    {
      id: 'pa-5',
      type: 'member',
      title: 'Elena Petrovska',
      meta: 'FINKI, 1st year',
      submittedAt: '2026-10-04T11:45:00+02:00',
    },
  ],
  activity: [
    {
      id: 'ac-1',
      actor: { name: 'Ana Trajkovska', initials: 'AT' },
      summary: 'published Workshop: AI at the Edge',
      at: '2026-10-04T16:18:00+02:00',
    },
    {
      id: 'ac-2',
      actor: { name: 'Stefan Nikolovski', initials: 'SN' },
      summary: 'edited Home page › Hero',
      at: '2026-10-03T21:14:00+02:00',
    },
    {
      id: 'ac-3',
      actor: { name: 'Marija Stojanovska', initials: 'MS' },
      summary: 'approved 3 Memories',
      at: '2026-10-03T18:02:00+02:00',
    },
    {
      id: 'ac-4',
      actor: { name: 'Daniel Ristov', initials: 'DR' },
      summary: 'exported applications for Leading Teams (CSV)',
      at: '2026-10-02T16:40:00+02:00',
    },
    {
      id: 'ac-5',
      actor: { name: 'Ana Trajkovska', initials: 'AT' },
      summary: 'added sponsor Gridnova (Gold)',
      at: '2026-10-01T11:25:00+02:00',
    },
    { id: 'ac-6', actor: null, summary: 'Daily backup completed', at: '2026-10-04T03:00:00+02:00' },
  ],
  openEvents: [
    {
      eventId: 'ev-ai-at-the-edge',
      title: 'Workshop: AI at the Edge',
      deadline: '2026-10-18T23:59:00+02:00',
      total: 38,
      newCount: 6,
      maxParticipants: 24,
      status: 'open',
    },
    {
      eventId: 'ev-leading-teams',
      title: 'Soft Skills Training: Leading Teams',
      deadline: '2026-10-06T23:59:00+02:00',
      total: 23,
      newCount: 4,
      maxParticipants: 30,
      status: 'deadline_soon',
    },
    {
      eventId: 'ev-fpga-basics',
      title: 'Hands-on: FPGA Basics',
      deadline: '2026-11-15T23:59:00+01:00',
      total: 27,
      newCount: 0,
      maxParticipants: 20,
      status: 'waitlist',
    },
  ],
};
