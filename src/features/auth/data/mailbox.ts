import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

// The mock mailbox (stands in for the e-mail service of M22): nothing is sent. Every e-mail the
// member flow would send is kept here with its link, so a person (devtools panel) or a test
// (`/api/dev-mailbox`) can open the link. Dev and preview only.

export type MockMailKind =
  | 'confirm'
  | 'reset'
  | 'approved'
  | 'rejected'
  | 'email_change'
  | 'deleted'
  // Memories (M17): the board's decision on a Memory or on changes to a published one.
  | 'memory_published'
  | 'memory_rejected'
  | 'memory_changes_approved'
  | 'memory_changes_rejected'
  // The board is told about something new to look at (Memories, M17; ideas and feedback, M18).
  | 'board_memory'
  | 'board_idea'
  | 'board_feedback'
  // The copy of an idea or of feedback sent to the person who gave an e-mail (not anonymous).
  | 'idea_copy'
  | 'feedback_copy';

export type MockMail = {
  id: string;
  to: string;
  kind: MockMailKind;
  subject: string;
  /** Where the e-mail's button goes ("/auth/confirm?token=…"); null when it has none. */
  link: string | null;
  /** The board's reason, for a rejection. */
  reason: string | null;
  sentAt: string;
};

const table = () => mockTable<{ mail: MockMail[] }>('mailbox', () => ({ mail: [] }));

export function sendMockMail(mail: Omit<MockMail, 'id'>): void {
  table().mail.unshift({ id: crypto.randomUUID(), ...mail });
}

/** Newest first; `to` narrows it to one address. */
export function listMockMail(to?: string): MockMail[] {
  const key = to?.trim().toLowerCase();
  return table().mail.filter((mail) => !key || mail.to.toLowerCase() === key);
}
