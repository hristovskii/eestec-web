import type { DashboardData } from '../types';

/** Admin dashboard summary. Event managers get only their own events (D18). */
export interface DashboardRepository {
  getDashboard(query: { eventIds?: readonly string[] }): Promise<DashboardData>;
}
