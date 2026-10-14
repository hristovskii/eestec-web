import 'server-only';

import { listNotes } from '@/features/notes/server';
import { type Paged, paginate } from '@/shared/data/paged';
import type { InboxParams } from '@/shared/lib/inbox-params';
import { matchesQuery } from '@/shared/lib/inbox';

import { contactRepository, messagesRepository } from './data';
import { CONTACT_STATUSES, type ContactMessage, type ContactStatus } from './types';

const statusOf = (value: string | undefined): ContactStatus | undefined =>
  (CONTACT_STATUSES as readonly string[]).includes(value ?? '') ? (value as ContactStatus) : undefined;

/** Does the message match what the Inbox list is filtered by (status, subject, search)? */
export function matchesContactFilter(message: ContactMessage, params: InboxParams): boolean {
  const status = statusOf(params.status);
  return (
    (!status || message.status === status) &&
    (!params.subject || message.subjectId === params.subject) &&
    matchesQuery(params.q, message.name, message.email, message.message, message.subject, message.reference)
  );
}

/** Admin › Inbox › Contact messages: one page of the list, the counts, the subjects and the open message with its notes. Callers check the permission. */
export async function getContactInbox(params: InboxParams) {
  const repo = await messagesRepository('session');
  const [all, { subjects }] = await Promise.all([repo.list(), (await contactRepository('session')).get()]);
  const page: Paged<ContactMessage> = paginate(
    all.filter((message) => matchesContactFilter(message, params)),
    params.page,
    params.size,
  );
  const open = params.open ? await repo.get(params.open) : null;
  return {
    page,
    counts: {
      all: all.length,
      new: all.filter((message) => message.status === 'new').length,
      unread: all.filter((message) => message.readAt === null).length,
    },
    /** The subjects of the select (the board's list now; the wording of old messages is on them). */
    subjects: subjects.map((subject) => ({ id: subject.id, name: subject.name.en || subject.name.mk })),
    open,
    notes: open ? await listNotes('contact_message', open.id) : [],
  };
}

/** The messages a CSV export covers, newest first. */
export async function listContactMessages(): Promise<ContactMessage[]> {
  return (await messagesRepository('session')).list();
}
