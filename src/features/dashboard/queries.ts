import 'server-only';

import { listApplicationOverview } from '@/features/applications/server';
import { accessTo, type Actor } from '@/features/auth';
import { listMemberRegistrations } from '@/features/auth/server';
import { countNewMessages } from '@/features/contact/server';
import { getEventsByIds } from '@/features/events/server';
import { countNewSubmissions } from '@/features/ideas/server';
import { countNewApplications } from '@/features/join/server';
import { getAuthorCards } from '@/features/members/server';
import { listMemoryQueue } from '@/features/memories/server';
import { countNewInquiries } from '@/features/partners/server';
import { isEnabled } from '@/shared/config/flags';

import { dashboardRepository } from './data';
import type { AdminBadgeCounts, DashboardData, OpenEventApplications, PendingApproval } from './types';

const YEAR = {
  '1': '1st year',
  '2': '2nd year',
  '3': '3rd year',
  '4': '4th year',
  master: 'Master’s',
  phd: 'PhD',
} as const;

/** Dashboard for this admin: event managers see their own events only (D18). Dynamic (session). */
export async function getDashboard(actor: Actor): Promise<DashboardData> {
  const own = accessTo(actor, 'dashboard') === 'own';
  const [summary, applications, contact, partners, membership, registrations, memoryQueue, ideas] =
    await Promise.all([
      (await dashboardRepository()).getDashboard({ own }),
      listApplicationOverview(actor),
      countNewMessages(),
      countNewInquiries(),
      countNewApplications(),
      listMemberRegistrations('pending'),
      listMemoryQueue(),
      countNewSubmissions(),
    ]);
  // Member registrations are the real ones (confirmed, waiting for the board), oldest first.
  const memberApprovals: PendingApproval[] = registrations.map((registration) => ({
    id: registration.userId,
    type: 'member',
    title: registration.name,
    meta: `${registration.faculty}, ${YEAR[registration.year]}`,
    submittedAt: registration.confirmedAt ?? registration.submittedAt,
  }));
  // Memories waiting for the board (and changes to published ones) are the real queue, oldest first.
  const [authors, eventsById] = await Promise.all([
    getAuthorCards(
      'member',
      'en',
      memoryQueue.flatMap((item) => (item.authorId ? [item.authorId] : [])),
    ),
    getEventsByIds(
      memoryQueue.flatMap((item) => (item.eventId ? [item.eventId] : [])),
      'en',
    ),
  ]);
  const memoryApprovals: PendingApproval[] = memoryQueue.map((item) => {
    const author = item.authorId ? (authors[item.authorId]?.name ?? 'A member') : 'A former member';
    const event =
      eventsById.find((candidate) => candidate.id === item.eventId)?.title.text ?? item.otherEventName;
    const parts: string[] = [author];
    if (event) parts.push(event);
    if (item.kind === 'revision') parts.push('changes');
    return {
      id: item.id,
      type: 'memory',
      title: item.title,
      meta: parts.join(' · '),
      submittedAt: item.submittedAt,
    };
  });
  // "Applications for open events": events whose form takes applications on the site right now
  // (drafts are not on the site).
  const openEvents = applications
    .filter((event) => event.apply.canApply && event.status !== 'draft')
    .map((event): OpenEventApplications => ({
      eventId: event.id,
      title: event.title,
      deadline: event.apply.closesAt,
      total: event.summary?.total ?? 0,
      newCount: event.summary?.newCount ?? 0,
      maxParticipants: event.applicationSettings.maxParticipants ?? 0,
      status:
        event.apply.phase === 'full_waitlist'
          ? 'waitlist'
          : event.apply.phase === 'deadline_soon'
            ? 'deadline_soon'
            : 'open',
    }));
  return {
    ...summary,
    pending: [...memberApprovals, ...memoryApprovals],
    counters: {
      ...summary.counters,
      ideas,
      memberRegistrations: {
        count: registrations.length,
        oldestAt: registrations[0] ? (registrations[0].confirmedAt ?? registrations[0].submittedAt) : null,
      },
      memoriesToApprove: { count: memoryQueue.length, oldestAt: memoryQueue[0]?.submittedAt ?? null },
      membershipApplications: { count: membership },
      messages: { contact, partners },
      openEventApplications: {
        total: openEvents.reduce((sum, row) => sum + row.total, 0),
        newCount: openEvents.reduce((sum, row) => sum + row.newCount, 0),
        events: openEvents.length,
      },
    },
    openEvents,
  };
}

/** Red counts in the sidebar: only areas this admin can open; Phase 2 areas only when enabled. */
export function badgeCounts(actor: Actor, data: DashboardData): AdminBadgeCounts {
  const c = data.counters;
  const phase2 = isEnabled('phase2');
  return {
    approvals:
      phase2 && accessTo(actor, 'approvals') !== 'none'
        ? c.memberRegistrations.count + c.memoriesToApprove.count
        : 0,
    inbox:
      accessTo(actor, 'inbox') !== 'none'
        ? c.membershipApplications.count + c.messages.contact + c.messages.partners
        : 0,
    ideas: phase2 && accessTo(actor, 'ideas') === 'full' ? c.ideas.newIdeas + c.ideas.newFeedback : 0,
  };
}
