import { slugify, uniqueSlug } from '@/shared/lib/slug';

/**
 * Addresses that a Memory can never have: `/memories/new` is the editor and would hide a Memory
 * with that slug (docs/ARCHITECTURE.md §3).
 */
export const RESERVED_MEMORY_SLUGS: readonly string[] = ['new', 'edit', 'preview'];

export function memorySlug(title: string, taken: (slug: string) => boolean): string {
  const base = slugify(title) || 'memory';
  return uniqueSlug(base, (slug) => RESERVED_MEMORY_SLUGS.includes(slug) || taken(slug));
}
