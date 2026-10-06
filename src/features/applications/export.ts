import 'server-only';

import { recordActivity } from '@/features/activity/server';
import { authorize } from '@/features/auth/server';
import { formatDate } from '@/shared/i18n/format';
import { resolveText } from '@/shared/i18n/localized';
import { type CsvColumn, toCsv } from '@/shared/lib/csv';

import { exportEventApplications } from './admin-queries';
import { applicationsRepository } from './data';
import { adminApplicationsParamsSchema } from './schemas/admin-applications-params.schema';
import type { AnswerValue, Application, ApplicationField } from './types';

const STATUS = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlist: 'Waitlist',
} as const;

/** An answer as a spreadsheet cell: the option's label, "Yes", the file name. */
export function answerText(field: ApplicationField, value: AnswerValue | undefined): string {
  if (value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : '';
  if (typeof value === 'object') return value.fileName;
  if (field.type === 'select') {
    const option = field.options?.find((candidate) => candidate.value === value);
    return option ? resolveText(option.label, 'en').text : value;
  }
  return value;
}

/** Admin › Applications › Export CSV: one event's applications with every answer (filters apply). */
export async function applicationsCsvResponse(searchParams: URLSearchParams): Promise<Response> {
  const params = adminApplicationsParamsSchema.parse(Object.fromEntries(searchParams));
  const session = await authorize(
    'view',
    'applications',
    params.event ? { eventId: params.event } : undefined,
  );
  if (!session || !params.event) return new Response('Forbidden', { status: 403 });
  const loaded = await exportEventApplications(session, params);
  if (!loaded) return new Response('Not found', { status: 404 });

  const columns: CsvColumn<Application>[] = [
    { header: 'Reference', value: (row) => row.reference },
    { header: 'Name', value: (row) => row.name },
    { header: 'E-mail', value: (row) => row.email },
    { header: 'Status', value: (row) => STATUS[row.status] },
    { header: 'Waitlist position', value: (row) => row.waitlistPosition ?? '' },
    { header: 'Submitted', value: (row) => formatDate(row.createdAt, 'en', 'dateTime') },
    { header: 'Language', value: (row) => row.locale.toUpperCase() },
    ...loaded.fields.map((field): CsvColumn<Application> => ({
      header: resolveText(field.label, 'en').text,
      value: (row) => answerText(field, row.answers[field.key]),
    })),
  ];
  await recordActivity(session, {
    action: 'exported',
    area: 'applications',
    target: `${loaded.rows.length} applications for ${loaded.event.title} (CSV)`,
    href: `/admin/applications?event=${loaded.event.id}`,
  });
  return new Response(toCsv(loaded.rows, columns), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="applications-${loaded.event.slug}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

/** A CV from an application (private: admins with access to the event only). */
export async function applicationFileResponse(fileId: string): Promise<Response> {
  const repo = await applicationsRepository();
  const file = await repo.getFile(fileId);
  const owner = file ? await repo.findByFile(fileId) : null;
  const session = owner ? await authorize('view', 'applications', { eventId: owner.eventId }) : null;
  if (!file || !owner || !session) return new Response('Not found', { status: 404 });
  return new Response(file.bytes as BodyInit, {
    headers: {
      'Content-Type': file.type,
      'Content-Disposition': `attachment; filename="${file.fileName.replace(/["\\]/g, '')}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
