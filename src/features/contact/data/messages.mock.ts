import 'server-only';

import { mockTable } from '@/shared/data/mock/store';
import { isoToZoned } from '@/shared/lib/zoned-time';

import type { ContactMessage } from '../types';
import { messagesFixture } from './fixtures/messages';
import type { MessagesRepository } from './messages.repository';

const tables = () =>
  mockTable<{ messages: ContactMessage[] }>('contact-messages', () => ({
    messages: structuredClone(messagesFixture),
  }));

/** "MSG-2026-0231": the next number of the year, counted from the references already used. */
function nextReference(messages: ContactMessage[], year: string) {
  const used = messages
    .map((message) => /^MSG-(\d{4})-(\d+)$/.exec(message.reference))
    .filter((match): match is RegExpExecArray => match?.[1] === year)
    .map((match) => Number(match[2]));
  return `MSG-${year}-${String(Math.max(0, ...used) + 1).padStart(4, '0')}`;
}

export function createMockMessagesRepository(): MessagesRepository {
  const db = tables();
  return {
    submit(input, now) {
      const created = now.toISOString();
      const message: ContactMessage = {
        ...structuredClone(input),
        id: `cm-${crypto.randomUUID().slice(0, 8)}`,
        reference: nextReference(db.messages, isoToZoned(created).date.slice(0, 4)),
        status: 'new',
        readAt: null,
        consentAt: created,
        createdAt: created,
      };
      db.messages.unshift(message);
      return Promise.resolve(structuredClone(message));
    },

    list(query) {
      const rows = db.messages.filter((message) => !query?.status || message.status === query.status);
      return Promise.resolve(
        structuredClone([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      );
    },

    get(id) {
      const message = db.messages.find((candidate) => candidate.id === id);
      return Promise.resolve(message ? structuredClone(message) : null);
    },

    updateStatus(id, status) {
      const message = db.messages.find((candidate) => candidate.id === id);
      if (!message) return Promise.resolve(null);
      message.status = status;
      return Promise.resolve(structuredClone(message));
    },

    setRead(id, readAt) {
      const message = db.messages.find((candidate) => candidate.id === id);
      if (!message) return Promise.resolve(null);
      message.readAt = readAt ? readAt.toISOString() : null;
      return Promise.resolve(structuredClone(message));
    },

    markAllRead(now) {
      const unread = db.messages.filter((message) => message.readAt === null);
      for (const message of unread) message.readAt = now.toISOString();
      return Promise.resolve(unread.length);
    },
  };
}
