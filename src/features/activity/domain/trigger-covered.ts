import type { ActivityEntry } from '../types';

/**
 * What the database writes by itself (M20f): a row trigger logs every real change to an event (created, updated,
 * deleted: one entry per row, bulk actions included) and to an inbox item (its status), and skips changes that
 * change nothing, "mark as read", and an event going live (that one is logged explicitly as "published").
 * The actions still report all of these, as they did on mocks, so the Supabase repository leaves out what a trigger
 * has already recorded. Everything else (pages, settings, notes, exports, taxonomy, approvals…) is recorded explicitly.
 */
const EVENT_ROW_HREF = /^\/admin\/events(\/[0-9a-f-]{36})?$/i;

export function writtenByTrigger(entry: Pick<ActivityEntry, 'area' | 'action' | 'href'>): boolean {
  if (entry.area === 'events')
    return (
      (entry.action === 'created' || entry.action === 'updated' || entry.action === 'deleted') &&
      (entry.href === undefined || EVENT_ROW_HREF.test(entry.href))
    );
  if (entry.area === 'inbox')
    return (
      (entry.action === 'updated' || entry.action === 'deleted') && !!entry.href?.startsWith('/admin/inbox?')
    );
  return false;
}
