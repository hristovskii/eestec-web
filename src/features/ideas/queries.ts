import 'server-only';

import { authorize } from '@/features/auth/server';
import { getEventCardsByIds } from '@/features/events/server';
import { env } from '@/shared/config/env';
import { devSurfacesEnabled } from '@/shared/config/flags';
import type { Locale } from '@/shared/i18n/routing';

import { ideaFormRepository, submissionsRepository } from './data';

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
 * A file that came with an idea or a feedback, for the board only (on mock data a stand-in for the private bucket,
 * dev and preview only). Event managers read the rating and impression of feedback on their own events (D18) but
 * never its photos or attachments (D29, D33): the board's right is 'edit', and a database reads the file as the
 * signed-in person, whose row and object policies only the board passes.
 */
export async function submissionFileResponse(id: string): Promise<Response> {
  if (env.DATA_SOURCE === 'mock' && !devSurfacesEnabled()) return new Response('Not found', { status: 404 });
  // 'edit' is the board's right on ideas: event managers only have 'ownRead' (D18), which must not reach files.
  const allowed = await authorize('edit', 'ideas');
  if (!allowed) return new Response('Forbidden', { status: 403 });
  const repo = await submissionsRepository('session');
  const file = (await repo.fileOwner(id)) ? await repo.readFile(id) : null;
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(file.bytes), {
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
  // A visitor may read nothing of an idea: the repository hands over the event ids and no more.
  const ids = await (await submissionsRepository('public')).acceptedEventIds(50);
  if (ids.length === 0) return [];
  const events = await getEventCardsByIds(ids, locale);
  return events.slice(0, 4).map((event) => ({ id: event.id, title: event.title.text, slug: event.slug }));
}
