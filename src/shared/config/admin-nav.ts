// Admin sidebar in canvas order (AdminSidebar). Hrefs follow routes.md (D4). The (panel) layout drops
// items the user may not see (permissions, D18) or that belong to Phase 2.

export type AdminNavKey =
  | 'dashboard'
  | 'approvals'
  | 'inbox'
  | 'events'
  | 'applications'
  | 'members'
  | 'memories'
  | 'ideas'
  | 'home'
  | 'map'
  | 'journey'
  | 'join'
  | 'sponsors'
  | 'contact'
  | 'media'
  | 'settings'
  | 'users';

export type AdminCountKey = 'approvals' | 'inbox' | 'ideas';
export type AdminNavGroupKey = 'main' | 'content' | 'pages' | 'system';

export type AdminNavEntry = {
  key: AdminNavKey;
  href: string;
  /** Permission area (features/auth/domain/permissions.ts). */
  area: string;
  phase2?: boolean;
  count?: AdminCountKey;
};

export const ADMIN_NAV: { key: AdminNavGroupKey; items: AdminNavEntry[] }[] = [
  {
    key: 'main',
    items: [
      { key: 'dashboard', href: '/admin', area: 'dashboard' },
      { key: 'approvals', href: '/admin/approvals', area: 'approvals', phase2: true, count: 'approvals' },
      { key: 'inbox', href: '/admin/inbox', area: 'inbox', count: 'inbox' },
    ],
  },
  {
    key: 'content',
    items: [
      { key: 'events', href: '/admin/events', area: 'events' },
      { key: 'applications', href: '/admin/applications', area: 'applications' },
      { key: 'members', href: '/admin/members', area: 'members', phase2: true },
      { key: 'memories', href: '/admin/memories', area: 'memories', phase2: true },
      { key: 'ideas', href: '/admin/ideas', area: 'ideas', phase2: true, count: 'ideas' },
    ],
  },
  {
    key: 'pages',
    items: [
      { key: 'home', href: '/admin/pages/home', area: 'pages' },
      { key: 'map', href: '/admin/pages/map', area: 'pages' },
      { key: 'journey', href: '/admin/pages/journey', area: 'pages' },
      { key: 'join', href: '/admin/pages/join', area: 'pages' },
      { key: 'sponsors', href: '/admin/pages/sponsors', area: 'pages' },
      { key: 'contact', href: '/admin/pages/contact', area: 'pages' },
    ],
  },
  {
    key: 'system',
    items: [
      { key: 'media', href: '/admin/media', area: 'media' },
      { key: 'settings', href: '/admin/settings', area: 'settings' },
      { key: 'users', href: '/admin/users', area: 'adminUsers' },
    ],
  },
];
