import { type Paged, paginate } from '@/shared/data/paged';

import {
  type Application,
  type ApplicationRow,
  type ApplicationsQuery,
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type StatusCounts,
} from '../types';

const byCreated = (a: Application, b: Application) => Date.parse(a.createdAt) - Date.parse(b.createdAt);

const toRow = (row: Application): ApplicationRow => ({
  id: row.id,
  eventId: row.eventId,
  reference: row.reference,
  name: row.name,
  email: row.email,
  status: row.status,
  waitlistPosition: row.waitlistPosition,
  createdAt: row.createdAt,
  readAt: row.readAt,
});

const emptyByStatus = () =>
  Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0])) as Record<ApplicationStatus, number>;

/**
 * One event's list: search (name, e-mail, reference), the tab counts (they ignore the status filter, not
 * the search), the status filter, sorting and paging. `rows` are the applications of that event; the mock
 * and the Supabase repository use this one function.
 */
export function listApplicationRows(
  rows: readonly Application[],
  query: ApplicationsQuery,
): Paged<ApplicationRow> & { counts: StatusCounts } {
  const needle = query.q?.trim().toLowerCase();
  const matching = rows.filter(
    (row) =>
      !needle ||
      row.name.toLowerCase().includes(needle) ||
      row.email.toLowerCase().includes(needle) ||
      row.reference.toLowerCase().includes(needle),
  );
  const counts: StatusCounts = { all: matching.length, ...emptyByStatus() };
  for (const row of matching) counts[row.status] += 1;
  const filtered = matching.filter((row) => !query.status || row.status === query.status);
  const sorted = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case 'newest':
        return byCreated(b, a);
      case 'oldest':
        return byCreated(a, b);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'waitlist':
        return (
          (a.waitlistPosition ?? Number.MAX_SAFE_INTEGER) - (b.waitlistPosition ?? Number.MAX_SAFE_INTEGER) ||
          byCreated(a, b)
        );
    }
  });
  const page = paginate(sorted, query.page, query.pageSize);
  return { ...page, items: page.items.map(toRow), counts };
}
