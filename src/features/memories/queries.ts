import 'server-only';

import { env } from '@/shared/config/env';
import { devSurfacesEnabled } from '@/shared/config/flags';

import { memoriesRepository } from './data';
import type { MemoryContent } from './types';

// What other features need from Memories today: the account (delete), the profile (how many are
// published), the approvals count and the photo files. The public and author reads come with the
// screens that use them.

/** Deleting an account: not published Memories go; published ones too only when asked. */
export async function retireMemoriesOf(userId: string, alsoDeleteMemories: boolean) {
  return (await memoriesRepository('session')).retire(userId, alsoDeleteMemories);
}

export async function countMyPublishedMemories(userId: string): Promise<number> {
  return (await memoriesRepository('session')).countPublishedBy(userId);
}

/** Every Memory of this member, newest change first (the My Memories section of /profile). */
export async function listMyMemories(userId: string) {
  return (await memoriesRepository('session')).listMine(userId);
}

/** What the editor opens with: the member's own Memory by address or id; null for someone else's. */
export async function getMyMemoryForEditor(userId: string, ref: { slug: string } | { id: string }) {
  return (await memoriesRepository('session')).findMine(userId, ref);
}

/** Waiting Memories and waiting changes to published ones: the number on Approvals. */
export async function memoryQueueCount(): Promise<number> {
  return (await memoriesRepository('session')).queueCount();
}

/** The approval queue, oldest first (the dashboard lists it). */
export async function listMemoryQueue() {
  return (await memoriesRepository('session')).queue();
}

/**
 * GET /api/memory-photos/[id]: a Memory photo for whoever may see it. The repository answers "no file" for a missing one
 * and for one this viewer may not see, so the route cannot be used to find out which photos exist. A published photo is
 * public and kept for an hour; a draft's photo (its author and the board) is not shared. Mock photos exist only where
 * dev surfaces do, like the other mock files.
 */
export async function memoryPhotoResponse(id: string): Promise<Response> {
  if (env.DATA_SOURCE === 'mock' && !devSurfacesEnabled()) return new Response('Not found', { status: 404 });
  const file = await (await memoriesRepository('session')).photoFile(id);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(file.bytes), {
    headers: {
      'Content-Type': file.mimeType,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * "Turn this into a Memories post" on /submit: what a member's impression becomes as a Memory, with the same text and
 * photos (the photos get empty alt text, the editor's checklist flags them). The photos are stored as the member, so
 * they are theirs to use; the Memory itself is made together with the feedback (`submitFeedback`, one transaction on
 * a database), which is why this only builds the content.
 */
export async function memoryFromImpression(input: {
  userId: string;
  title: string;
  eventId: string | null;
  otherEventName: string;
  city: string;
  country: string;
  text: string;
  photos: { bytes: Uint8Array; mimeType: string; width: number; height: number }[];
}): Promise<MemoryContent> {
  const body = input.text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const repo = await memoriesRepository('session');
  const fileIds = await Promise.all(input.photos.map((photo) => repo.storePhoto(input.userId, photo)));
  return {
    title: input.title,
    eventId: input.eventId,
    otherEventName: input.otherEventName,
    city: input.city,
    country: input.country,
    happenedOn: null,
    body,
    cover: null,
    photos: fileIds.map((fileId) => ({
      id: crypto.randomUUID(),
      fileId,
      sample: null,
      alt: '',
      caption: '',
    })),
  };
}

/** The mock's way to make that Memory (a database makes it inside `submit_impression`); returns its id. */
export async function createImpressionMemory(
  userId: string,
  content: MemoryContent,
  now: Date,
): Promise<string> {
  const record = await (
    await memoriesRepository('session')
  ).createFromImpression(userId, content, 'impression', now);
  return record.id;
}
