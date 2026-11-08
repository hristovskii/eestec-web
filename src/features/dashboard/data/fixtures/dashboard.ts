// SAMPLE DATA — handoff/design-source/AdminDashboard.dc.html (counters, pending approvals, activity,
// applications for open events), relative to the canvas moment 2026-10-04 18:18 Europe/Skopje.
// Each part is replaced by real aggregation when its feature lands (inbox: counted from contact, partners
// and join since M12d; approvals M14 and Memories M17 and ideas M18 (all counted from their features), activity: features/activity; applications for open events come from applications since M7b). Counts are consistent with each other, so they differ
// from the illustrative canvas numbers (e.g. Approvals 7 = 3 registrations + 4 Memories, D2: the Memories come from the features' own samples).
import type { DashboardSummary } from '../../types';

export const dashboardFixture: DashboardSummary = {
  counters: {
    memberRegistrations: { count: 3, oldestAt: '2026-10-02T17:00:00+02:00' },
  },
  pending: [
    {
      id: 'pa-2',
      type: 'member',
      title: 'Daniel Ristov',
      meta: 'FEEIT, 2nd year',
      submittedAt: '2026-10-02T17:00:00+02:00',
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
