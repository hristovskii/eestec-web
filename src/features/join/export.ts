import 'server-only';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { formatDate } from '@/shared/i18n/format';
import { type CsvColumn, toCsv } from '@/shared/lib/csv';
import { exportWindow, inWindow, parseExportParams } from '@/shared/lib/inbox';
import { inboxParamsSchema } from '@/shared/lib/inbox-params';
import { now } from '@/shared/lib/now';

import { listApplications, matchesApplicationFilter } from './admin-queries';
import type { MembershipApplication } from './types';

const STATUS = { new: 'New', contacted: 'Contacted', accepted: 'Accepted', rejected: 'Rejected' } as const;

const COLUMNS: CsvColumn<MembershipApplication>[] = [
  { header: 'Received', value: (row) => formatDate(row.createdAt, 'en', 'dateTime') },
  { header: 'Name', value: (row) => row.name },
  { header: 'E-mail', value: (row) => row.email },
  { header: 'Phone', value: (row) => row.phone },
  { header: 'Faculty', value: (row) => row.faculty },
  { header: 'Study program', value: (row) => row.studyProgram },
  { header: 'Year of study', value: (row) => row.yearOfStudy },
  { header: 'Interests', value: (row) => row.interests.join(', ') },
  { header: 'Heard about us from', value: (row) => row.heardFrom },
  { header: 'Status', value: (row) => STATUS[row.status] },
  { header: 'Read', value: (row) => (row.readAt ? 'Yes' : 'No') },
  { header: 'Language', value: (row) => row.locale.toUpperCase() },
];

/**
 * Admin › Inbox › Export CSV (membership applications): the date range, rejected ones or not, and
 * optionally only what the list is filtered by. `?count=1` answers with the number of rows.
 */
export async function applicationsInboxCsvResponse(searchParams: URLSearchParams): Promise<Response> {
  const session = await authorize('view', 'inbox');
  if (!session) return new Response('Forbidden', { status: 403 });
  const options = parseExportParams(searchParams);
  const filter = inboxParamsSchema.parse(Object.fromEntries(searchParams));
  const window = exportWindow(options, now());
  const rows = (await listApplications()).filter(
    (row) =>
      inWindow(row.createdAt, window) &&
      (options.closed || row.status !== 'rejected') &&
      (!options.current || matchesApplicationFilter(row, filter)),
  );
  if (options.count)
    return Response.json({ count: rows.length }, { headers: { 'Cache-Control': 'no-store' } });

  await recordActivity(session, {
    action: 'exported',
    area: 'inbox',
    target: `${rows.length} membership applications (CSV)`,
    href: '/admin/inbox?tab=membership',
  });
  return new Response(toCsv(rows, COLUMNS), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="membership-applications.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
