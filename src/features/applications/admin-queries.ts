import 'server-only';

import { can, type Actor } from '@/features/auth';
import type { AdminEventRow, ApplicationCountsLoader } from '@/features/events';
import { listApplicationEvents } from '@/features/events/server';
import { getSiteSettings } from '@/features/settings/server';
import { now } from '@/shared/lib/now';

import { applicationsRepository } from './data';
import { applicationState, type ApplyState } from './domain/application-state';
import { DEFAULT_APPLICATION_FIELDS } from './domain/default-form';
import { type AdminApplicationsParams, sortOf } from './schemas/admin-applications-params.schema';
import type { Application, ApplicationField, ApplicationsSummary } from './types';

// Admin › Applications (docs/ARCHITECTURE.md §3): uncached, permission-aware reads. Event
// managers see the applications of their events only (D18).

/** The Applications column of Admin › Events: totals, and "full" when the accepted fill the places. */
export const applicationCounts: ApplicationCountsLoader = async (rows) => {
  const summaries = await (await applicationsRepository()).summaries(rows.map((row) => row.id));
  return Object.fromEntries(
    rows.flatMap((row) => {
      const summary = summaries[row.id];
      if (!summary) return [];
      const max = row.applicationSettings.maxParticipants;
      return [[row.id, { count: summary.total, full: max !== null && summary.byStatus.accepted >= max }]];
    }),
  );
};

export type ApplicationEvent = Pick<
  AdminEventRow,
  'id' | 'slug' | 'title' | 'startsAt' | 'endsAt' | 'allDay' | 'timing' | 'status' | 'applicationSettings'
> & {
  apply: ApplyState;
  summary: ApplicationsSummary | null;
};

const toApplicationEvent = (
  row: AdminEventRow,
  summary: ApplicationsSummary | undefined,
  settings: { deadlineSoonHours: number; autoCloseApplications: boolean },
  at: Date,
): ApplicationEvent => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  allDay: row.allDay,
  timing: row.timing,
  status: row.status,
  applicationSettings: row.applicationSettings,
  apply: applicationState(
    { startsAt: row.startsAt, applications: row.applicationSettings },
    at,
    settings,
    summary ? { taken: summary.byStatus.accepted, waitlist: summary.byStatus.waitlist } : null,
  ),
  summary: summary ?? null,
});

/** Every event with applications on this site that this admin may see, with numbers and state. */
export async function listApplicationOverview(actor: Actor): Promise<ApplicationEvent[]> {
  const [rows, settings, repo] = await Promise.all([
    listApplicationEvents(actor),
    getSiteSettings('en'),
    applicationsRepository(),
  ]);
  const summaries = await repo.summaries(rows.map((row) => row.id));
  const at = now();
  return rows
    .filter((row) => row.applicationSettings.enabled || summaries[row.id])
    .map((row) => toApplicationEvent(row, summaries[row.id], settings.events, at));
}

/** /admin/applications: the events of one tab, and both tab counts. */
export async function getApplicationsOverview(actor: Actor, tab: AdminApplicationsParams['tab']) {
  const all = await listApplicationOverview(actor);
  const upcoming = all.filter((row) => row.timing === 'upcoming');
  const past = all.filter((row) => row.timing === 'past' && row.summary);
  return {
    rows: tab === 'upcoming' ? upcoming : past,
    counts: { upcoming: upcoming.length, past: past.length },
  };
}

export type ApplicationDetail = Application & { fields: ApplicationField[] };

/**
 * /admin/applications?event=: the event, one page of its applications, the form's fields (labels
 * for the detail and the export) and the opened application. null: unknown or not allowed.
 */
export async function getEventApplications(actor: Actor, params: AdminApplicationsParams) {
  if (!params.event || !can(actor, 'view', 'applications', { eventId: params.event })) return null;
  const event = (await listApplicationOverview(actor)).find((row) => row.id === params.event);
  if (!event) return null;
  const repo = await applicationsRepository();
  const [page, form, opened, accepted] = await Promise.all([
    repo.list({
      eventId: event.id,
      status: params.status,
      q: params.q,
      sort: sortOf(params),
      page: params.page,
      pageSize: params.size,
    }),
    repo.getForm(event.id),
    params.open ? repo.get(params.open) : Promise.resolve(null),
    repo.list({ eventId: event.id, status: 'accepted', sort: 'name', page: 1, pageSize: 10_000 }),
  ]);
  const fields = form?.fields ?? DEFAULT_APPLICATION_FIELDS;
  return {
    event,
    page,
    fields,
    opened: opened && opened.eventId === event.id ? opened : null,
    acceptedEmails: accepted.items.map((row) => row.email),
    canEdit: can(actor, 'edit', 'applications', { eventId: event.id }),
  };
}

/** Export CSV: every application of the event matching the filters. */
export async function exportEventApplications(actor: Actor, params: AdminApplicationsParams) {
  const loaded = await getEventApplications(actor, { ...params, page: 1, size: 100, open: undefined });
  if (!loaded) return null;
  const repo = await applicationsRepository();
  const all = await repo.list({
    eventId: loaded.event.id,
    status: params.status,
    q: params.q,
    sort: 'oldest',
    page: 1,
    pageSize: 100_000,
  });
  const rows = (await Promise.all(all.items.map((row) => repo.get(row.id)))).filter((row) => row !== null);
  return { event: loaded.event, fields: loaded.fields, rows };
}
