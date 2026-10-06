import 'server-only';

import { mockTable } from '@/shared/data/mock/store';
import { paginate } from '@/shared/data/paged';

import { formatReference } from '../domain/reference';
import {
  type Application,
  type ApplicationForm,
  type ApplicationRow,
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type StoredUpload,
} from '../types';
import type { ApplicationsRepository } from './applications.repository';
import { applicationFormsFixture, applicationsFixture } from './fixtures/applications';

type Tables = {
  forms: ApplicationForm[];
  applications: Application[];
  /** The private "cvs" bucket (in memory; restarts empty). */
  files: Record<string, StoredUpload & { createdAt: string }>;
};

const tables = () =>
  mockTable<Tables>('applications', () => ({
    forms: applicationFormsFixture,
    applications: applicationsFixture,
    files: {},
  }));

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const byCreated = (a: Application, b: Application) => Date.parse(a.createdAt) - Date.parse(b.createdAt);
const emptyByStatus = () =>
  Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0])) as Record<ApplicationStatus, number>;

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

export function createMockApplicationsRepository(): ApplicationsRepository {
  const db = tables();
  const ofEvent = (eventId: string) => db.applications.filter((row) => row.eventId === eventId);

  /** Waitlist positions 1…n in their current order (new arrivals have none yet: they go last). */
  const renumberWaitlist = (eventId: string) => {
    const waiting = ofEvent(eventId)
      .filter((row) => row.status === 'waitlist')
      .sort(
        (a, b) =>
          (a.waitlistPosition ?? Number.MAX_SAFE_INTEGER) - (b.waitlistPosition ?? Number.MAX_SAFE_INTEGER) ||
          byCreated(a, b),
      );
    waiting.forEach((row, index) => (row.waitlistPosition = index + 1));
    for (const row of ofEvent(eventId)) if (row.status !== 'waitlist') row.waitlistPosition = null;
  };

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
      const waiting = rows.filter((row) => row.status === 'waitlist').length;
      const full = input.maxParticipants !== null && taken >= input.maxParticipants;
      // First come is fair: while anyone is waiting, a free place goes to them, not to a newcomer.
      const queued = full || (input.admission === 'first_come' && input.waitlist && waiting > 0);
      if (queued && !input.waitlist) return Promise.resolve({ status: 'full' });
      const status: ApplicationStatus = queued
        ? 'waitlist'
        : input.admission === 'first_come'
          ? 'accepted'
          : 'pending';
      const at = now.toISOString();
      const application: Application = {
        id: `app-${crypto.randomUUID().slice(0, 8)}`,
        eventId: input.eventId,
        reference: formatReference(input.referencePrefix, input.eventStartsAt, rows.length + 1),
        name: input.name.trim(),
        email: input.email.trim(),
        answers: structuredClone(input.answers),
        status,
        waitlistPosition: status === 'waitlist' ? waiting + 1 : null,
        locale: input.locale,
        consentAt: at,
        createdAt: at,
        readAt: null,
      };
      db.applications.push(application);
      return Promise.resolve({ status: 'created', application: structuredClone(application) });
    },

    storeFile(upload, now) {
      const fileId = `cv-${crypto.randomUUID()}`;
      db.files[fileId] = {
        fileId,
        fileName: upload.name,
        size: upload.bytes.byteLength,
        type: upload.type,
        bytes: upload.bytes,
        createdAt: now.toISOString(),
      };
      return Promise.resolve({ fileId, fileName: upload.name, size: upload.bytes.byteLength });
    },

    list(query) {
      const needle = query.q?.trim().toLowerCase();
      const matching = ofEvent(query.eventId).filter(
        (row) =>
          !needle ||
          row.name.toLowerCase().includes(needle) ||
          row.email.toLowerCase().includes(needle) ||
          row.reference.toLowerCase().includes(needle),
      );
      const counts = { all: matching.length, ...emptyByStatus() };
      for (const row of matching) counts[row.status] += 1;
      const rows = matching.filter((row) => !query.status || row.status === query.status);
      const sorted = [...rows].sort((a, b) => {
        switch (query.sort) {
          case 'newest':
            return byCreated(b, a);
          case 'oldest':
            return byCreated(a, b);
          case 'name':
            return a.name.localeCompare(b.name);
          case 'waitlist':
            return (
              (a.waitlistPosition ?? Number.MAX_SAFE_INTEGER) -
                (b.waitlistPosition ?? Number.MAX_SAFE_INTEGER) || byCreated(a, b)
            );
        }
      });
      const page = paginate(sorted, query.page, query.pageSize);
      return Promise.resolve({ ...page, items: page.items.map(toRow), counts });
    },

    get(id) {
      const row = db.applications.find((candidate) => candidate.id === id);
      return Promise.resolve(row ? structuredClone(row) : null);
    },

    summaries(eventIds) {
      const result: Record<
        string,
        { eventId: string; total: number; newCount: number; byStatus: Record<ApplicationStatus, number> }
      > = {};
      for (const row of db.applications) {
        if (!eventIds.includes(row.eventId)) continue;
        const entry = (result[row.eventId] ??= {
          eventId: row.eventId,
          total: 0,
          newCount: 0,
          byStatus: emptyByStatus(),
        });
        entry.total += 1;
        if (!row.readAt) entry.newCount += 1;
        entry.byStatus[row.status] += 1;
      }
      return Promise.resolve(result);
    },

    setStatus(eventId, ids, status) {
      const changed: string[] = [];
      // In the order they were sent, so a bulk move to the waitlist keeps first come first.
      for (const row of ofEvent(eventId).sort(byCreated)) {
        if (!ids.includes(row.id) || row.status === status) continue;
        row.status = status;
        row.waitlistPosition = null;
        changed.push(row.id);
      }
      renumberWaitlist(eventId);
      return Promise.resolve(changed);
    },

    markRead(id, now) {
      const row = db.applications.find((candidate) => candidate.id === id);
      if (row && !row.readAt) row.readAt = now.toISOString();
      return Promise.resolve();
    },

    findByFile(fileId) {
      const row = db.applications.find((candidate) =>
        Object.values(candidate.answers).some(
          (answer) => typeof answer === 'object' && answer.fileId === fileId,
        ),
      );
      return Promise.resolve(row ? structuredClone(row) : null);
    },

    getFile(fileId) {
      const file = db.files[fileId];
      return Promise.resolve(
        file
          ? { fileId, fileName: file.fileName, size: file.size, type: file.type, bytes: file.bytes }
          : null,
      );
    },
  };
}
