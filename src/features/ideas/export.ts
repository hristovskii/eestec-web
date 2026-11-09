import 'server-only';

import { recordActivity } from '@/features/activity/server';
import { accessTo } from '@/features/auth';
import { getSession } from '@/features/auth/server';
import { formatDate } from '@/shared/i18n/format';
import { type CsvColumn, toCsv } from '@/shared/lib/csv';

import { ideaFormRepository, submissionsRepository } from './data';
import type { Feedback, Idea, SubmissionStatus } from './types';

const STATUS: Record<SubmissionStatus, string> = {
  new: 'New',
  under_review: 'Under review',
  accepted: 'Accepted',
  archived: 'Archived',
};

/** Anonymous means nothing to export: the identity columns are empty, never a placeholder name. */
const who = (row: Idea | Feedback) => ({
  name: row.isAnonymous ? '' : (row.name ?? ''),
  email: row.isAnonymous ? '' : (row.email ?? ''),
  member: row.isAnonymous ? '' : row.userId ? 'Yes' : 'No',
});

const common = [
  { header: 'Received', value: (row: Idea | Feedback) => formatDate(row.createdAt, 'en', 'dateTime') },
  { header: 'Status', value: (row: Idea | Feedback) => STATUS[row.status] },
  { header: 'Owner', value: (row: Idea | Feedback) => row.ownerName ?? '' },
  { header: 'Anonymous', value: (row: Idea | Feedback) => (row.isAnonymous ? 'Yes' : 'No') },
  { header: 'Name', value: (row: Idea | Feedback) => who(row).name },
  { header: 'E-mail', value: (row: Idea | Feedback) => who(row).email },
  { header: 'Member', value: (row: Idea | Feedback) => who(row).member },
  { header: 'Language', value: (row: Idea | Feedback) => row.locale.toUpperCase() },
] satisfies CsvColumn<Idea | Feedback>[];

/**
 * Admin › Ideas › Export CSV: every idea, or every piece of feedback (an event manager only that of
 * their own events). `?count=1` answers with the number of rows.
 */
export function ideasCsvResponse(kind: 'ideas' | 'feedback') {
  return async (searchParams: URLSearchParams): Promise<Response> => {
    const session = await getSession();
    const access = session ? accessTo(session, 'ideas') : 'none';
    if (!session || access === 'none' || (kind === 'ideas' && access !== 'full'))
      return new Response('Forbidden', { status: 403 });
    const repo = await submissionsRepository('session');
    const onlyEventIds = access === 'ownRead' ? session.managedEventIds : undefined;
    const types = kind === 'ideas' ? (await (await ideaFormRepository('session')).get()).types : [];
    const typeName = (id: string) => {
      const type = types.find((candidate) => candidate.id === id);
      return type ? (type.name.en ?? type.name.mk) : id;
    };

    const rows: (Idea | Feedback)[] =
      kind === 'ideas' ? await repo.allIdeas() : await repo.allFeedback(onlyEventIds);
    if (searchParams.get('count') === '1')
      return Response.json({ count: rows.length }, { headers: { 'Cache-Control': 'no-store' } });

    const columns: CsvColumn<Idea | Feedback>[] =
      kind === 'ideas'
        ? [
            { header: 'Type', value: (row) => typeName((row as Idea).typeId) },
            { header: 'Title', value: (row) => (row as Idea).title },
            { header: 'Idea', value: (row) => (row as Idea).description },
            ...common,
          ]
        : [
            { header: 'Event', value: (row) => (row as Feedback).eventTitle },
            { header: 'Rating', value: (row) => (row as Feedback).rating },
            { header: 'Feedback', value: (row) => (row as Feedback).text },
            { header: 'Also a Memory', value: (row) => ((row as Feedback).memoryId ? 'Yes' : 'No') },
            ...common,
          ];
    await recordActivity(session, {
      action: 'exported',
      area: 'ideas',
      target: `${rows.length} ${kind === 'ideas' ? 'ideas' : 'pieces of feedback'} (CSV)`,
      href: `/admin/ideas?tab=${kind}`,
    });
    return new Response(toCsv(rows, columns), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${kind === 'ideas' ? 'ideas' : 'event-feedback'}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  };
}
