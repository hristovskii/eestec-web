import 'server-only';

import { mockTable } from '@/shared/data/mock/store';
import { isoToZoned } from '@/shared/lib/zoned-time';

import type { PartnerInquiry } from '../types';
import { inquiriesFixture } from './fixtures/inquiries';
import type { InquiriesRepository } from './inquiries.repository';

const tables = () =>
  mockTable<{ inquiries: PartnerInquiry[] }>('partner-inquiries', () => ({
    inquiries: structuredClone(inquiriesFixture),
  }));

/** "PRT-2026-0017": the next number of the year, counted from the references already used. */
function nextReference(inquiries: PartnerInquiry[], year: string) {
  const used = inquiries
    .map((inquiry) => /^PRT-(\d{4})-(\d+)$/.exec(inquiry.reference))
    .filter((match): match is RegExpExecArray => match?.[1] === year)
    .map((match) => Number(match[2]));
  return `PRT-${year}-${String(Math.max(0, ...used) + 1).padStart(4, '0')}`;
}

export function createMockInquiriesRepository(): InquiriesRepository {
  const db = tables();
  return {
    submit(input, now) {
      const created = now.toISOString();
      const inquiry: PartnerInquiry = {
        ...structuredClone(input),
        id: `pi-${crypto.randomUUID().slice(0, 8)}`,
        reference: nextReference(db.inquiries, isoToZoned(created).date.slice(0, 4)),
        status: 'new',
        consentAt: created,
        createdAt: created,
      };
      db.inquiries.unshift(inquiry);
      return Promise.resolve(structuredClone(inquiry));
    },

    list(query) {
      const rows = db.inquiries.filter((inquiry) => !query?.status || inquiry.status === query.status);
      return Promise.resolve(
        structuredClone([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      );
    },

    updateStatus(id, status) {
      const inquiry = db.inquiries.find((candidate) => candidate.id === id);
      if (!inquiry) return Promise.resolve(null);
      inquiry.status = status;
      return Promise.resolve(structuredClone(inquiry));
    },
  };
}
