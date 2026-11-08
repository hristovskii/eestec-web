import 'server-only';

import { env } from '@/shared/config/env';
import { devSurfacesEnabled } from '@/shared/config/flags';

import { memoriesRepository } from './data';
import { readMockMemoryPhoto } from './data/memory-photos';

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
