import type { MemoryChange, MemoryContent } from '../types';

const photoKey = (content: MemoryContent) =>
  content.photos.map((photo) => `${photo.fileId ?? photo.sample}|${photo.alt}|${photo.caption}`).join(',');

/** What a revision changes compared with the live version (shown to the board above the preview). */
export function changesBetween(live: MemoryContent, next: MemoryContent): MemoryChange[] {
  const changes: MemoryChange[] = [];
  if (live.title !== next.title) changes.push('title');
  if (live.body !== next.body) changes.push('text');
  if (JSON.stringify(live.cover) !== JSON.stringify(next.cover)) changes.push('cover');
  if (photoKey(live) !== photoKey(next)) changes.push('photos');
  if (live.eventId !== next.eventId || live.otherEventName !== next.otherEventName) changes.push('event');
  if (live.city !== next.city || live.country !== next.country) changes.push('place');
  if (live.happenedOn !== next.happenedOn) changes.push('date');
  return changes;
}
