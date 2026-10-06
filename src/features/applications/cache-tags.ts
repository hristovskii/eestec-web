/** Cache tags of the public application reads: places change with every application. */
export const applicationTags = {
  all: 'applications',
  event: (eventId: string) => `applications:${eventId}`,
} as const;
