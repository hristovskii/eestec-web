import 'server-only';

import { authorize } from '@/features/auth/server';
import { getEventCardsByIds } from '@/features/events/server';
import { env } from '@/shared/config/env';
import { devSurfacesEnabled } from '@/shared/config/flags';
import type { Locale } from '@/shared/i18n/routing';

import { ideaFormRepository, submissionsRepository } from './data';
import { readMockSubmissionFile } from './data/submission-files';

/** The new ideas and new feedback: the dashboard tile and the sidebar badge. */
export async function countNewSubmissions(): Promise<{ newIdeas: number; newFeedback: number }> {
  const repo = await submissionsRepository('session');
  const [ideas, feedback] = await Promise.all([repo.ideaCounts(), repo.feedbackCounts()]);
  return { newIdeas: ideas.new, newFeedback: feedback.new };
}

/** The page's texts and idea types, in both languages (Form settings), or resolved by the page. */
export async function getIdeaFormSettings() {
  return (await ideaFormRepository()).get();
}

/**
 * A file that came with an idea or a feedback, for the board only (mock stand-in for a signed link).
 * Event managers may open photos of feedback of their own events (D18); nobody else, and nothing
 * at all on real data until the private bucket exists.
 */
export async function submissionFileResponse(id: string): Promise<Response> {
  if (!(devSurfacesEnabled() && env.DATA_SOURCE === 'mock'))
    return new Response('Not found', { status: 404 });
  const owner = await (await submissionsRepository('session')).fileOwner(id);
  const file = owner ? readMockSubmissionFile(id) : null;
  if (!owner || !file) return new Response('Not found', { status: 404 });
  const allowed = await authorize(
    'view',
    'ideas',
    owner.kind === 'feedback' && owner.eventId ? { eventId: owner.eventId } : undefined,
  );
  if (!allowed) return new Response('Forbidden', { status: 403 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * "Ideas that became events": accepted ideas whose event draft the board has published since, as
 * the events they are. A draft that is still hidden is not shown; nothing about the sender is.
 */
export async function getIdeasThatBecameEvents(
  locale: Locale,
): Promise<{ id: string; title: string; slug: string }[]> {
  const { items } = await (
    await submissionsRepository('session')
  ).listIdeas({ status: 'accepted', page: 1, pageSize: 50 });
  const ids = items.flatMap((idea) => (idea.eventDraftId ? [idea.eventDraftId] : []));
  if (ids.length === 0) return [];
  const events = await getEventCardsByIds(ids, locale);
  return events.slice(0, 4).map((event) => ({ id: event.id, title: event.title.text, slug: event.slug }));
}
