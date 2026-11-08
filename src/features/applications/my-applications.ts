import 'server-only';

import { updateTag } from 'next/cache';

import { getEventsByIds } from '@/features/events/server';
import type { Locale } from '@/shared/i18n/routing';

import { applicationTags } from './cache-tags';
import { applicationsRepository } from './data';
import { type MyApplicationView, toMyApplications } from './domain/my-applications';

// "My applications" on /profile and what happens to them when a person withdraws or deletes their
// account. Applications belong to an e-mail (the form has no log-in), so the caller passes the
// signed-in member's e-mail. Reads depend on the viewer, so nothing here is cached.

export type { MyApplicationView };

export async function getMyApplications(email: string, locale: Locale): Promise<MyApplicationView[]> {
  const applications = await (await applicationsRepository()).listByEmail(email);
  if (applications.length === 0) return [];
  const events = await getEventsByIds([...new Set(applications.map((item) => item.eventId))], locale);
  return toMyApplications(applications, events);
}

/** The person takes an application back (or leaves the waitlist): it is deleted and the places refresh. */
export async function withdrawMyApplication(id: string, email: string): Promise<boolean> {
  const repo = await applicationsRepository();
  const application = (await repo.listByEmail(email)).find((item) => item.id === id);
  if (!application) return false;
  const result = await repo.withdraw(id, email);
  if (result !== 'withdrawn') return false;
  updateTag(applicationTags.event(application.eventId));
  updateTag(applicationTags.all);
  return true;
}

/** Account deletion: every application of this e-mail goes. */
export async function deleteApplicationsOf(email: string): Promise<number> {
  const repo = await applicationsRepository();
  const events = new Set((await repo.listByEmail(email)).map((item) => item.eventId));
  const count = await repo.deleteByEmail(email);
  for (const eventId of events) updateTag(applicationTags.event(eventId));
  if (count > 0) updateTag(applicationTags.all);
  return count;
}

/** "Download my data": every application of this e-mail as stored (answers included; uploaded files by name only). */
export async function exportApplicationsOf(email: string) {
  const rows = await (await applicationsRepository()).listByEmail(email);
  return rows.map((row) => ({
    reference: row.reference,
    eventId: row.eventId,
    status: row.status,
    waitlistPosition: row.waitlistPosition,
    appliedAt: row.createdAt,
    consentAt: row.consentAt,
    name: row.name,
    email: row.email,
    answers: Object.fromEntries(
      Object.entries(row.answers).map(([key, value]) => [
        key,
        typeof value === 'object' && 'fileName' in value ? { file: value.fileName } : value,
      ]),
    ),
  }));
}
