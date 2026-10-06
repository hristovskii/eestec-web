// SAMPLE DATA — handoff/design-source/AdminDashboard.dc.html (counters, pending approvals, activity,
// applications for open events), relative to the canvas moment 2026-10-04 18:18 Europe/Skopje.
// Each part is replaced by real aggregation when its feature lands (inbox M10–M12, approvals M14/M17,
// ideas M18, activity: features/activity; applications for open events come from applications since M7b). Counts are consistent with each other, so they differ
// from the illustrative canvas numbers (e.g. Approvals 7 = 3 registrations + 4 Memories, D2).
import type { DashboardSummary } from '../../types';

export const dashboardFixture: DashboardSummary = {
  counters: {
    memberRegistrations: { count: 3, oldestAt: '2026-10-02T17:00:00+02:00' },
    memoriesToApprove: { count: 4, oldestAt: '2026-10-04T13:10:00+02:00' },
    ideas: { newIdeas: 5, newFeedback: 4 },
    membershipApplications: { count: 12 },
    messages: { contact: 5, partners: 2 },
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
};
