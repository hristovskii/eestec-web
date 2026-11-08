import 'server-only';

import { env } from '@/shared/config/env';
import { devSurfacesEnabled } from '@/shared/config/flags';

import { memoriesRepository } from './data';
import { readMockMemoryPhoto, saveMockMemoryPhoto } from './data/memory-photos';
import { notifyBoardOfMemory } from './notify';
import type { MemoryRecord } from './types';

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

/** A photo file of the mock store (dev and preview only, like the other mock files). */
export function memoryPhotoResponse(id: string): Response {
  if (!(devSurfacesEnabled() && env.DATA_SOURCE === 'mock'))
    return new Response('Not found', { status: 404 });
  const file = readMockMemoryPhoto(id);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      'Content-Type': file.mimeType,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * "Turn this into a Memories post" on /submit: the member's impression becomes a Memory that waits
 * for the board, with the same text and photos (the photos get empty alt text, the editor's checklist
 * flags them). One call, so the backend phase can make it one transaction (docs/ARCHITECTURE.md §4).
 */
export async function createMemoryFromImpression(input: {
  userId: string;
  title: string;
  eventId: string | null;
  otherEventName: string;
  city: string;
  country: string;
  text: string;
  photos: { bytes: Uint8Array; mimeType: string; width: number; height: number }[];
  now: Date;
}): Promise<MemoryRecord> {
  const body = input.text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const record = await (
    await memoriesRepository('session')
  ).createFromImpression(
    input.userId,
    {
      title: input.title,
      eventId: input.eventId,
      otherEventName: input.otherEventName,
      city: input.city,
      country: input.country,
      happenedOn: null,
      body,
      cover: null,
      photos: input.photos.map((photo) => ({
        id: crypto.randomUUID(),
        fileId: saveMockMemoryPhoto(photo),
        sample: null,
        alt: '',
        caption: '',
      })),
    },
    'impression',
    input.now,
  );
  await notifyBoardOfMemory({ title: input.title, revision: false, now: input.now });
  return record;
}
