import 'server-only';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { formatDate } from '@/shared/i18n/format';
import { type CsvColumn, toCsv } from '@/shared/lib/csv';
import { exportWindow, inWindow, parseExportParams } from '@/shared/lib/inbox';
import { inboxParamsSchema } from '@/shared/lib/inbox-params';
import { now } from '@/shared/lib/now';

import { listInquiries, matchesInquiryFilter } from './admin-queries';
import type { PartnerInquiry } from './types';

const STATUS = { new: 'New', in_progress: 'In progress', done: 'Done' } as const;
const INTEREST = {
  sponsorship: 'Sponsorship',
  workshop: 'Workshop',
  job_fair: 'Job fair',
  other: 'Other',
} as const;

const COLUMNS: CsvColumn<PartnerInquiry>[] = [
  { header: 'Reference', value: (row) => row.reference },
  { header: 'Received', value: (row) => formatDate(row.createdAt, 'en', 'dateTime') },
  { header: 'Company', value: (row) => row.company },
  { header: 'Contact person', value: (row) => row.contactPerson },
  { header: 'E-mail', value: (row) => row.email },
  { header: 'Phone', value: (row) => row.phone },
  { header: 'Interested in', value: (row) => row.interests.map((interest) => INTEREST[interest]).join(', ') },
  { header: 'Status', value: (row) => STATUS[row.status] },
  { header: 'Read', value: (row) => (row.readAt ? 'Yes' : 'No') },
  { header: 'Language', value: (row) => row.locale.toUpperCase() },
  { header: 'Message', value: (row) => row.message },
];

/**
 * Admin › Inbox › Export CSV (partner inquiries): the date range, finished ones or not, and
 * optionally only what the list is filtered by. `?count=1` answers with the number of rows.
 */
export async function inquiriesCsvResponse(searchParams: URLSearchParams): Promise<Response> {
  const session = await authorize('view', 'inbox');
  if (!session) return new Response('Forbidden', { status: 403 });
  const options = parseExportParams(searchParams);
  const filter = inboxParamsSchema.parse(Object.fromEntries(searchParams));
  const window = exportWindow(options, now());
  const rows = (await listInquiries()).filter(
    (row) =>
      inWindow(row.createdAt, window) &&
      (options.closed || row.status !== 'done') &&
      (!options.current || matchesInquiryFilter(row, filter)),
  );
  if (options.count)
    return Response.json({ count: rows.length }, { headers: { 'Cache-Control': 'no-store' } });

  await recordActivity(session, {
    action: 'exported',
    area: 'inbox',
    target: `${rows.length} partner inquiries (CSV)`,
    href: '/admin/inbox?tab=partners',
  });
  return new Response(toCsv(rows, COLUMNS), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="partner-inquiries.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
