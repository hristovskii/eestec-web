import 'server-only';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { formatDate } from '@/shared/i18n/format';
import { type CsvColumn, toCsv } from '@/shared/lib/csv';
import { exportWindow, inWindow, parseExportParams } from '@/shared/lib/inbox';
import { inboxParamsSchema } from '@/shared/lib/inbox-params';
import { now } from '@/shared/lib/now';

import { listContactMessages, matchesContactFilter } from './admin-queries';
import type { ContactMessage } from './types';

const STATUS = { new: 'New', answered: 'Answered', archived: 'Archived' } as const;

const COLUMNS: CsvColumn<ContactMessage>[] = [
  { header: 'Reference', value: (row) => row.reference },
  { header: 'Received', value: (row) => formatDate(row.createdAt, 'en', 'dateTime') },
  { header: 'Name', value: (row) => row.name },
  { header: 'E-mail', value: (row) => row.email },
  { header: 'Subject', value: (row) => row.subject },
  { header: 'Sent to', value: (row) => row.routedTo },
  { header: 'Status', value: (row) => STATUS[row.status] },
  { header: 'Read', value: (row) => (row.readAt ? 'Yes' : 'No') },
  { header: 'Language', value: (row) => row.locale.toUpperCase() },
  { header: 'Message', value: (row) => row.message },
];

/**
 * Admin › Inbox › Export CSV (contact messages): the date range, archived or not, and optionally
 * only what the list is filtered by. `?count=1` answers with the number of rows (the popover).
 */
export async function contactCsvResponse(searchParams: URLSearchParams): Promise<Response> {
  const session = await authorize('view', 'inbox');
  if (!session) return new Response('Forbidden', { status: 403 });
  const options = parseExportParams(searchParams);
  const filter = inboxParamsSchema.parse(Object.fromEntries(searchParams));
  const window = exportWindow(options, now());
  const rows = (await listContactMessages()).filter(
    (row) =>
      inWindow(row.createdAt, window) &&
      (options.closed || row.status !== 'archived') &&
      (!options.current || matchesContactFilter(row, filter)),
  );
  if (options.count)
    return Response.json({ count: rows.length }, { headers: { 'Cache-Control': 'no-store' } });

  await recordActivity(session, {
    action: 'exported',
    area: 'inbox',
    target: `${rows.length} contact messages (CSV)`,
    href: '/admin/inbox?tab=contact',
  });
  return new Response(toCsv(rows, COLUMNS), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="contact-messages.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
