import 'server-only';

import { accessTo, type Actor } from '@/features/auth';
import { listAdminAccounts } from '@/features/auth/server';
import { listNotes } from '@/features/notes/server';
import { now } from '@/shared/lib/now';

import { ideaFormRepository, submissionsRepository } from './data';
import { academicYearOf, academicYearRange } from './domain/academic-year';
import type { AdminIdeasParams } from './schemas/admin-ideas-params.schema';

/** Event managers read the feedback and ratings of their own events only (D18); the board sees all. */
const scopeOf = (actor: Actor) => {
  const own = accessTo(actor, 'ideas') === 'ownRead';
  return { own, onlyEventIds: own ? (actor.managedEventIds ?? []) : undefined };
};

/** The numbers beside the tabs: what is new, in the part this person may see. */
export async function getIdeasTabCounts(actor: Actor) {
  const { own, onlyEventIds } = scopeOf(actor);
  const repo = await submissionsRepository('session');
  const [ideas, feedback] = await Promise.all([repo.ideaCounts(), repo.feedbackCounts(onlyEventIds)]);
  return { ideas: own ? 0 : ideas.new, feedback: feedback.new };
}

/** The board people an idea can be given to ("Daniel Ristov"), by name. */
export async function listIdeaOwners() {
  const accounts = await listAdminAccounts();
  return accounts
    .filter((account) => account.role !== 'event_manager' && account.status === 'active')
    .map((account) => ({ id: account.userId, name: account.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Admin › Ideas › Ideas: one page, the counts, the types, and the open idea with its notes. */
export async function getIdeasList(params: AdminIdeasParams) {
  const repo = await submissionsRepository('session');
  const [page, counts, form, open] = await Promise.all([
    repo.listIdeas({
      ...(params.status ? { status: params.status } : {}),
      ...(params.type ? { typeId: params.type } : {}),
      ...(params.q ? { q: params.q } : {}),
      page: params.page,
      pageSize: params.size,
    }),
    repo.ideaCounts(),
    ideaFormRepository('session').then((form) => form.get()),
    params.open ? repo.getIdea(params.open) : Promise.resolve(null),
  ]);
  return {
    page,
    counts,
    types: form.types,
    open,
    notes: open ? await listNotes('idea', open.id) : [],
  };
}

/** Admin › Ideas › Event feedback (limited to some events for an event manager). */
export async function getFeedbackList(actor: Actor, params: AdminIdeasParams) {
  const { onlyEventIds } = scopeOf(actor);
  const repo = await submissionsRepository('session');
  const [page, counts, events, open] = await Promise.all([
    repo.listFeedback({
      ...(params.status ? { status: params.status } : {}),
      ...(params.event ? { eventKey: params.event } : {}),
      ...(params.q ? { q: params.q } : {}),
      ...(onlyEventIds ? { onlyEventIds } : {}),
      page: params.page,
      pageSize: params.size,
    }),
    repo.feedbackCounts(onlyEventIds),
    repo.feedbackEvents(onlyEventIds),
    params.open ? repo.getFeedback(params.open) : Promise.resolve(null),
  ]);
  // Someone else's feedback is not opened by its address.
  const visible =
    open && (!onlyEventIds || (open.eventId !== null && onlyEventIds.includes(open.eventId))) ? open : null;
  return {
    page,
    counts,
    events,
    open: visible,
    notes: visible && !onlyEventIds ? await listNotes('feedback', visible.id) : [],
  };
}

/** Admin › Ideas › Ratings per event, for one academic year (the current one unless the URL says). */
export async function getRatings(actor: Actor, params: AdminIdeasParams) {
  const { onlyEventIds } = scopeOf(actor);
  const repo = await submissionsRepository('session');
  const all = await repo.allFeedback(onlyEventIds);
  const years = [
    ...new Set(all.filter((row) => row.rating !== null).map((row) => academicYearOf(row.createdAt))),
  ].sort((a, b) => b - a);
  const current = academicYearOf(now().toISOString());
  const selected = params.year ?? current;
  const range = selected === 'all' ? {} : academicYearRange(selected);
  const rows = await repo.ratings({ ...range, ...(onlyEventIds ? { onlyEventIds } : {}) });
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const average = total
    ? Math.round((rows.reduce((sum, row) => sum + row.average * row.count, 0) / total) * 10) / 10
    : null;
  return {
    rows,
    total,
    average,
    selected,
    /** The years that have ratings, plus the selected one so the select never loses its value. */
    years: [...new Set([...years, ...(selected === 'all' ? [] : [selected])])].sort((a, b) => b - a),
  };
}
