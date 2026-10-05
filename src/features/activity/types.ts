/** What happened. Rendered with admin.activity.actions.<action> ("published {target}"). */
export const ACTIVITY_ACTIONS = [
  'created',
  'updated',
  'published',
  'deleted',
  'approved',
  'rejected',
  'exported',
  'uploaded',
  'backup',
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

/** Where it happened (filter on /admin/activity). */
export const ACTIVITY_AREAS = [
  'events',
  'applications',
  'approvals',
  'pages',
  'partners',
  'media',
  'settings',
  'users',
  'system',
] as const;
export type ActivityArea = (typeof ACTIVITY_AREAS)[number];

export type ActivityActor = { userId: string; name: string; initials: string };

/**
 * One line of the activity log. Written by the actions on mocks; by database triggers in the
 * backend phase. `target` is what was changed, as shown ("Workshop: AI at the Edge").
 */
export type ActivityEntry = {
  id: string;
  at: string;
  /** null: done by the system (backups, scheduled jobs). */
  actor: ActivityActor | null;
  action: ActivityAction;
  area: ActivityArea;
  target: string;
  /** Admin page of the target, when there is one. */
  href?: string;
};

export type ActivityQuery = {
  area?: ActivityArea;
  actorId?: string;
  page: number;
  pageSize: number;
};
