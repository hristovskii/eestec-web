/** Counters on the dashboard and the red counts in the sidebar (AdminDashboard). */
export type DashboardCounters = {
  memberRegistrations: { count: number; oldestAt: string | null };
  memoriesToApprove: { count: number; oldestAt: string | null };
  ideas: { newIdeas: number; newFeedback: number };
  membershipApplications: { count: number };
  messages: { contact: number; partners: number };
  openEventApplications: { total: number; newCount: number; events: number };
};

export type PendingApproval = {
  id: string;
  type: 'member' | 'memory';
  title: string;
  /** e.g. "Marija Stojanovska" or "FEEIT, 2nd year" (content). */
  meta: string;
  submittedAt: string;
};

export type ActivityEntry = {
  id: string;
  actor: { name: string; initials: string } | null;
  /** Rendered summary, e.g. "published Workshop: AI at the Edge". System entries have no actor. */
  summary: string;
  at: string;
};

export type OpenEventApplications = {
  eventId: string;
  title: string;
  deadline: string;
  total: number;
  newCount: number;
  maxParticipants: number;
  status: 'open' | 'deadline_soon' | 'waitlist';
};

export type DashboardData = {
  counters: DashboardCounters;
  pending: PendingApproval[];
  activity: ActivityEntry[];
  openEvents: OpenEventApplications[];
};

export type AdminBadgeCounts = { approvals: number; inbox: number; ideas: number };
