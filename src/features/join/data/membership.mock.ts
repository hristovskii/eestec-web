import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import type { MembershipApplication } from '../types';
import { membershipFixture } from './fixtures/membership';
import type { MembershipRepository } from './membership.repository';

const tables = () =>
  mockTable<{ applications: MembershipApplication[] }>('membership', () => ({
    applications: structuredClone(membershipFixture),
  }));

const newId = () => `ma-${crypto.randomUUID().slice(0, 8)}`;
const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function createMockMembershipRepository(): MembershipRepository {
  const db = tables();
  return {
    submit(input, now) {
      const open = db.applications.some(
        (application) => sameEmail(application.email, input.email) && application.status !== 'rejected',
      );
      if (open) return Promise.resolve({ status: 'duplicate' });
      const application: MembershipApplication = {
        ...structuredClone(input),
        id: newId(),
        status: 'new',
        readAt: null,
        consentAt: now.toISOString(),
        createdAt: now.toISOString(),
      };
      db.applications.unshift(application);
      return Promise.resolve({ status: 'created', application: structuredClone(application) });
    },

    list(query) {
      const rows = db.applications.filter(
        (application) => !query?.status || application.status === query.status,
      );
      return Promise.resolve(
        structuredClone([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      );
    },

    get(id) {
      const application = db.applications.find((candidate) => candidate.id === id);
      return Promise.resolve(application ? structuredClone(application) : null);
    },

    updateStatus(id, status) {
      const application = db.applications.find((candidate) => candidate.id === id);
      if (!application) return Promise.resolve(null);
      application.status = status;
      return Promise.resolve(structuredClone(application));
    },

    setRead(id, readAt) {
      const application = db.applications.find((candidate) => candidate.id === id);
      if (!application) return Promise.resolve(null);
      application.readAt = readAt ? readAt.toISOString() : null;
      return Promise.resolve(structuredClone(application));
    },

    markAllRead(now) {
      const unread = db.applications.filter((application) => application.readAt === null);
      for (const application of unread) application.readAt = now.toISOString();
      return Promise.resolve(unread.length);
    },
  };
}
