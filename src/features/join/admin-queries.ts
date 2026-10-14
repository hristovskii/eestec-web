import 'server-only';

import { listNotes } from '@/features/notes/server';
import { type Paged, paginate } from '@/shared/data/paged';
import { matchesQuery } from '@/shared/lib/inbox';
import type { InboxParams } from '@/shared/lib/inbox-params';

import { membershipRepository } from './data';
import { MEMBERSHIP_STATUSES, type MembershipApplication, type MembershipStatus } from './types';

const statusOf = (value: string | undefined): MembershipStatus | undefined =>
  (MEMBERSHIP_STATUSES as readonly string[]).includes(value ?? '') ? (value as MembershipStatus) : undefined;

/** Does the application match what the Inbox list is filtered by (status, search)? */
export function matchesApplicationFilter(application: MembershipApplication, params: InboxParams): boolean {
  const status = statusOf(params.status);
  return (
    (!status || application.status === status) &&
    matchesQuery(
      params.q,
      application.name,
      application.email,
      application.faculty,
      application.studyProgram,
      application.interests.join(' '),
    )
  );
}

/** Admin › Inbox › Membership applications: one page of the list, the counts and the open application with its notes. Callers check the permission. */
export async function getApplicationsInbox(params: InboxParams) {
  const repo = await membershipRepository('session');
  const all = await repo.list();
  const page: Paged<MembershipApplication> = paginate(
    all.filter((application) => matchesApplicationFilter(application, params)),
    params.page,
    params.size,
  );
  const open = params.open ? await repo.get(params.open) : null;
  return {
    page,
    counts: {
      all: all.length,
      new: all.filter((application) => application.status === 'new').length,
      unread: all.filter((application) => application.readAt === null).length,
    },
    open,
    notes: open ? await listNotes('membership_application', open.id) : [],
  };
}

/** The applications a CSV export covers, newest first. */
export async function listApplications(): Promise<MembershipApplication[]> {
  return (await membershipRepository('session')).list();
}
