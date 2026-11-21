import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import { unwrap } from '@/shared/data/supabase/errors';
import { isoOf, isoOrNull } from '@/shared/data/supabase/time';

import { memberMeta } from '../domain/pending-members';
import type { DashboardSummary } from '../types';
import type { DashboardRepository } from './dashboard.repository';

type Pending = {
  count: number;
  oldestAt: string | null;
  items: { id: string; name: string; faculty: string; year: string | null; submittedAt: string }[];
};

/**
 * What the dashboard keeps in its own tables: the members waiting for the board (confirmed their e-mail, oldest
 * first). Event managers see none (D18), and the database agrees: `dashboard_pending` answers them with zero. The
 * Memories queue, the inbox counts and the open events come from their own features.
 */
export function createSupabaseDashboardRepository(client: DbClient): DashboardRepository {
  return {
    async getDashboard({ own }): Promise<DashboardSummary> {
      if (own) return { counters: { memberRegistrations: { count: 0, oldestAt: null } }, pending: [] };
      const pending = unwrap(await client.rpc('dashboard_pending')) as unknown as Pending;
      return {
        counters: { memberRegistrations: { count: pending.count, oldestAt: isoOrNull(pending.oldestAt) } },
        pending: pending.items.map((item) => ({
          id: item.id,
          type: 'member',
          title: item.name,
          meta: memberMeta(item.faculty, item.year),
          submittedAt: isoOf(item.submittedAt),
        })),
      };
    },
  };
}
