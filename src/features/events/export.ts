import 'server-only';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { formatDate } from '@/shared/i18n/format';
import { type CsvColumn, toCsv } from '@/shared/lib/csv';
import { now } from '@/shared/lib/now';

import { exportAdminEvents } from './queries';
import { adminEventsParamsSchema } from './schemas/admin-events-params.schema';
import type { AdminEventRow, ApplicationCountsLoader } from './types';

const COLUMNS: CsvColumn<AdminEventRow>[] = [
  { header: 'Title', value: (row) => row.title },
  { header: 'Address', value: (row) => `/${row.timing === 'upcoming' ? 'upcoming' : 'events'}/${row.slug}` },
  { header: 'Starts', value: (row) => formatDate(row.startsAt, 'en', row.allDay ? 'date' : 'dateTime') },
  { header: 'Ends', value: (row) => formatDate(row.endsAt, 'en', row.allDay ? 'date' : 'dateTime') },
  { header: 'Type', value: (row) => row.typeName },
  { header: 'Category', value: (row) => (row.scope === 'local' ? 'Local' : 'International') },
  { header: 'Status', value: (row) => row.status[0]!.toUpperCase() + row.status.slice(1) },
  {
    header: 'Applications',
    value: (row) =>
      row.applications.kind === 'count'
        ? row.applications.count
        : row.applications.kind === 'external'
          ? 'External'
          : '',
  },
  { header: 'Last edited', value: (row) => formatDate(row.updatedAt, 'en', 'dateTime') },
  { header: 'Last edited by', value: (row) => row.updatedBy.name },
];

/** Admin › Events › Export CSV: the rows matching the list's filters (event managers: their own). */
export async function eventsCsvResponse(
  searchParams: URLSearchParams,
  loadCounts?: ApplicationCountsLoader,
): Promise<Response> {
  const session = await authorize('view', 'events');
  if (!session) return new Response('Forbidden', { status: 403 });
  const params = adminEventsParamsSchema.parse(Object.fromEntries(searchParams));
  const rows = await exportAdminEvents(session, params, loadCounts);
  await recordActivity(session, {
    action: 'exported',
    area: 'events',
    target: `${rows.length} events (CSV)`,
  });
  const day = now().toISOString().slice(0, 10);
  return new Response(toCsv(rows, COLUMNS), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="events-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
