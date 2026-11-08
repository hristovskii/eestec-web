import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

// The mock mailbox (stands in for the e-mail service of M22): nothing is sent. Every e-mail the
// member flow would send is kept here with its link, so a person (devtools panel) or a test
// (`/api/dev-mailbox`) can open the link. Dev and preview only.

export type MockMailKind = 'confirm' | 'reset' | 'approved' | 'rejected' | 'email_change' | 'deleted';

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
