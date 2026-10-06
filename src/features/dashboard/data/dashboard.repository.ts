import type { DashboardSummary } from '../types';

/** Admin dashboard summary. Event managers see no approvals (D18). */
export interface DashboardRepository {
  getDashboard(query: { own: boolean }): Promise<DashboardSummary>;
}
