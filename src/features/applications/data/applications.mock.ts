import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import { formatReference } from '../domain/reference';
import type { Application, ApplicationFile, ApplicationForm } from '../types';
import type { ApplicationsRepository } from './applications.repository';
import { applicationFormsFixture, applicationsFixture } from './fixtures/applications';

type StoredFile = ApplicationFile & { type: string; bytes: Uint8Array; createdAt: string };

type Tables = {
  forms: ApplicationForm[];
  applications: Application[];
  /** The private "cvs" bucket (in memory; restarts empty). */
  files: Record<string, StoredFile>;
};

const tables = () =>
  mockTable<Tables>('applications', () => ({
    forms: applicationFormsFixture,
    applications: applicationsFixture,
    files: {},
  }));

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function createMockApplicationsRepository(): ApplicationsRepository {
  const db = tables();
  const ofEvent = (eventId: string) => db.applications.filter((row) => row.eventId === eventId);

  return {
    getForm(eventId) {
      const form = db.forms.find((candidate) => candidate.eventId === eventId);
      return Promise.resolve(form ? structuredClone(form) : null);
    },

    availability(eventIds) {
      const result: Record<string, { taken: number; waitlist: number }> = {};
      for (const row of db.applications) {
        if (!eventIds.includes(row.eventId)) continue;
        const entry = (result[row.eventId] ??= { taken: 0, waitlist: 0 });
        if (row.status === 'accepted') entry.taken += 1;
        if (row.status === 'waitlist') entry.waitlist += 1;
      }
      return Promise.resolve(result);
    },

    // Synchronous from the first read to the write: two submissions can't both take the last place.
    submit(input, now) {
      const rows = ofEvent(input.eventId);
      if (rows.some((row) => sameEmail(row.email, input.email)))
        return Promise.resolve({ status: 'duplicate' });
      const taken = rows.filter((row) => row.status === 'accepted').length;
      const full = input.maxParticipants !== null && taken >= input.maxParticipants;
      if (full && !input.waitlist) return Promise.resolve({ status: 'full' });
      const waitlisted = rows.filter((row) => row.status === 'waitlist');
      const at = now.toISOString();
      const application: Application = {
        id: `app-${crypto.randomUUID().slice(0, 8)}`,
        eventId: input.eventId,
        reference: formatReference(input.referencePrefix, input.eventStartsAt, rows.length + 1),
        name: input.name.trim(),
        email: input.email.trim(),
        answers: structuredClone(input.answers),
        status: full ? 'waitlist' : 'pending',
        waitlistPosition: full
          ? Math.max(0, ...waitlisted.map((row) => row.waitlistPosition ?? 0)) + 1
          : null,
        locale: input.locale,
        consentAt: at,
        createdAt: at,
      };
      db.applications.push(application);
      return Promise.resolve({ status: 'created', application: structuredClone(application) });
    },

    storeFile(upload, now) {
      const file: StoredFile = {
        fileId: `cv-${crypto.randomUUID()}`,
        fileName: upload.name,
        size: upload.bytes.byteLength,
        type: upload.type,
        bytes: upload.bytes,
        createdAt: now.toISOString(),
      };
      db.files[file.fileId] = file;
      return Promise.resolve({ fileId: file.fileId, fileName: file.fileName, size: file.size });
    },
  };
}
