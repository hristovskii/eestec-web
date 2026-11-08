import 'server-only';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { resolveLocalized } from '@/shared/i18n/localized';
import { type CsvColumn, toCsv } from '@/shared/lib/csv';
import { now } from '@/shared/lib/now';

import { exportAdminMembers } from './queries';
import { adminMembersParamsSchema } from './schemas/admin-members-params.schema';
import type { Profile, Team } from './types';

type Row = { profile: Profile; teams: Team[] };

// No e-mail, phone or faculty: those stay with the person and with Approvals.
const COLUMNS: CsvColumn<Row>[] = [
  { header: 'name', value: (row) => row.profile.name },
  { header: 'username', value: (row) => row.profile.username },
  { header: 'status', value: (row) => row.profile.status },
  { header: 'visibility', value: (row) => row.profile.visibility },
  { header: 'teams', value: (row) => row.teams.map((team) => resolveLocalized(team.name, 'en')).join('; ') },
  { header: 'member since', value: (row) => row.profile.memberSince },
  { header: 'active until', value: (row) => row.profile.activeTo ?? '' },
];

/** Admin › Members › Export CSV: the rows matching the list's filters. */
export async function membersCsvResponse(searchParams: URLSearchParams): Promise<Response> {
  const session = await authorize('view', 'members');
  if (!session) return new Response('Forbidden', { status: 403 });
  const rows = await exportAdminMembers(adminMembersParamsSchema.parse(Object.fromEntries(searchParams)));
  await recordActivity(session, {
    action: 'exported',
    area: 'members',
    target: `${rows.length} members (CSV)`,
    href: '/admin/members',
  });
  const day = now().toISOString().slice(0, 10);
  return new Response(toCsv(rows, COLUMNS), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="members-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
