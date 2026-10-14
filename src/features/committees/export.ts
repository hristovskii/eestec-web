import 'server-only';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { countryName } from '@/shared/i18n/country';
import { type CsvColumn, toCsv } from '@/shared/lib/csv';
import { now } from '@/shared/lib/now';

import { exportAdminCommittees } from './queries';
import { adminCommitteesParamsSchema } from './schemas/admin-committees-params.schema';
import type { Committee } from './types';

/** The columns of Import CSV, so an export can be edited and imported again. */
const TYPE = { lc: 'LC', observer: 'Observer', jlc: 'JLC' } as const;
export const COMMITTEE_COLUMNS: CsvColumn<Committee>[] = [
  { header: 'name', value: (row) => row.name },
  { header: 'type', value: (row) => TYPE[row.status] },
  { header: 'city', value: (row) => row.city.en || row.city.mk },
  { header: 'country', value: (row) => countryName(row.country, 'en') },
  { header: 'lat', value: (row) => row.lat },
  { header: 'lng', value: (row) => row.lng },
  { header: 'link', value: (row) => row.url },
];

/** Admin › Map / Committees › Export CSV: the rows matching the list's filters. */
export async function committeesCsvResponse(searchParams: URLSearchParams): Promise<Response> {
  const session = await authorize('view', 'pages');
  if (!session) return new Response('Forbidden', { status: 403 });
  const rows = await exportAdminCommittees(
    adminCommitteesParamsSchema.parse(Object.fromEntries(searchParams)),
  );
  await recordActivity(session, {
    action: 'exported',
    area: 'pages',
    target: `${rows.length} committees (CSV)`,
    href: '/admin/pages/map',
  });
  const day = now().toISOString().slice(0, 10);
  return new Response(toCsv(rows, COMMITTEE_COLUMNS), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="committees-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
