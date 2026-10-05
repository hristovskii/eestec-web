import type { AdminRole } from '../types';

/**
 * The corrected permissions matrix (D18, docs/ARCHITECTURE.md §9). Every admin route, sidebar item
 * and server action asks `can()`. Supabase RLS enforces the same rules in the backend phase.
 */
export const ADMIN_AREAS = [
  'dashboard',
  'events',
  'eventTypes',
  'applications',
  'approvals',
  'inbox',
  'ideas',
  'pages',
  'members',
  'memories',
  'media',
  'cvExport',
  'activityLog',
  'settings',
  'adminUsers',
] as const;

export type AdminArea = (typeof ADMIN_AREAS)[number];

/**
 * full: everything in the area.
 * own: only items tied to the user (assigned events, own uploads).
 * read: view only.
 * ownRead: view only, limited to the user's own items.
 * none: no access.
 */
export type Access = 'full' | 'own' | 'read' | 'ownRead' | 'none';

export const PERMISSIONS: Record<AdminArea, Record<AdminRole, Access>> = {
  dashboard: { super_admin: 'full', editor: 'full', event_manager: 'own' },
  events: { super_admin: 'full', editor: 'full', event_manager: 'own' },
  eventTypes: { super_admin: 'full', editor: 'full', event_manager: 'none' },
  applications: { super_admin: 'full', editor: 'full', event_manager: 'own' },
  approvals: { super_admin: 'full', editor: 'full', event_manager: 'none' },
  inbox: { super_admin: 'full', editor: 'full', event_manager: 'none' },
  ideas: { super_admin: 'full', editor: 'full', event_manager: 'ownRead' },
  pages: { super_admin: 'full', editor: 'full', event_manager: 'none' },
  members: { super_admin: 'full', editor: 'full', event_manager: 'none' },
  memories: { super_admin: 'full', editor: 'full', event_manager: 'none' },
  media: { super_admin: 'full', editor: 'full', event_manager: 'own' },
  cvExport: { super_admin: 'full', editor: 'full', event_manager: 'none' },
  activityLog: { super_admin: 'full', editor: 'read', event_manager: 'none' },
  settings: { super_admin: 'full', editor: 'none', event_manager: 'none' },
  adminUsers: { super_admin: 'full', editor: 'none', event_manager: 'none' },
};

/** Who is asking: from the session. `managedEventIds` only matters for event managers. */
export type Actor = { adminRole: AdminRole | null; userId: string; managedEventIds?: readonly string[] };

export type Action = 'view' | 'edit' | 'publish' | 'create' | 'delete';

/** The item being acted on, when access depends on ownership. */
export type Resource = { eventId?: string; ownerId?: string };

export function accessTo(actor: Actor | null, area: AdminArea): Access {
  if (!actor?.adminRole) return 'none';
  return PERMISSIONS[area][actor.adminRole];
}

function owns(actor: Actor, resource: Resource | undefined): boolean {
  if (!resource) return false;
  if (resource.eventId !== undefined) return actor.managedEventIds?.includes(resource.eventId) ?? false;
  if (resource.ownerId !== undefined) return resource.ownerId === actor.userId;
  return false;
}

/**
 * Can `actor` do `action` in `area` (on `resource`)?
 * Without a resource, "own" access answers whether the area is reachable at all (lists filtered later).
 * Event managers never create, delete or reassign events (D18), only edit and publish assigned ones.
 */
export function can(actor: Actor | null, action: Action, area: AdminArea, resource?: Resource): boolean {
  const access = accessTo(actor, area);
  switch (access) {
    case 'full':
      return true;
    case 'none':
      return false;
    case 'read':
      return action === 'view';
    case 'ownRead':
      return action === 'view' && (resource === undefined || owns(actor!, resource));
    case 'own':
      if (area === 'events' && (action === 'create' || action === 'delete')) return false;
      return resource === undefined ? action === 'view' || action === 'create' : owns(actor!, resource);
  }
}

/** Is the admin panel open to this user at all? Members (no admin role) have no access. */
export const isStaff = (actor: Actor | null): boolean => actor?.adminRole != null;
