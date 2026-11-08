/** Cache tags of the public Memories reads, refreshed by every change to a Memory (updateTag). */
export const memoryTags = {
  list: 'memories',
  post: (slug: string) => `memory:${slug}`,
} as const;
