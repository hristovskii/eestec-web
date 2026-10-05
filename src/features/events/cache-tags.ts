/** Cache tags of the public event queries (M6), refreshed by every admin change. */
export const eventTags = {
  list: 'events',
  detail: (slug: string) => `event:${slug}`,
} as const;
