// SAMPLE DATA — handoff/design-source/AdminDashboard.dc.html (Recent activity), plus entries for
// the screens built so far (Settings, Media library). Around the canvas moment (4 Oct 2026).
import type { ActivityEntry } from '../../types';

const ana = { userId: 'u-ana', name: 'Ana Trajkovska', initials: 'AT' };
const stefan = { userId: 'u-stefan', name: 'Stefan Nikolovski', initials: 'SN' };
const marija = { userId: 'u-marija', name: 'Marija Stojanovska', initials: 'MS' };
const daniel = { userId: 'u-daniel', name: 'Daniel Ristov', initials: 'DR' };

export const activityFixture: ActivityEntry[] = [
  {
    id: 'ac-1',
    at: '2026-10-04T16:18:00+02:00',
    actor: ana,
    action: 'published',
    area: 'events',
    target: 'Workshop: AI at the Edge',
  },
  {
    id: 'ac-7',
    at: '2026-10-04T15:58:00+02:00',
    actor: daniel,
    action: 'uploaded',
    area: 'media',
    target: 'ai-at-the-edge-lab.jpg',
    href: '/admin/media',
  },
  {
    id: 'ac-6',
    at: '2026-10-04T03:00:00+02:00',
    actor: null,
    action: 'backup',
    area: 'system',
    target: 'Daily backup',
  },
  {
    id: 'ac-2',
    at: '2026-10-03T21:14:00+02:00',
    actor: stefan,
    action: 'updated',
    area: 'pages',
    target: 'Home page › Hero',
  },
  {
    id: 'ac-3',
    at: '2026-10-03T18:02:00+02:00',
    actor: marija,
    action: 'approved',
    area: 'approvals',
    target: '3 Memories',
  },
  {
    id: 'ac-4',
    at: '2026-10-02T16:40:00+02:00',
    actor: daniel,
    action: 'exported',
    area: 'applications',
    target: 'applications for Leading Teams (CSV)',
  },
  {
    id: 'ac-5',
    at: '2026-10-01T11:25:00+02:00',
    actor: ana,
    action: 'created',
    area: 'partners',
    target: 'sponsor Gridnova (Gold)',
  },
  {
    id: 'ac-8',
    at: '2026-09-30T10:05:00+02:00',
    actor: ana,
    action: 'updated',
    area: 'settings',
    target: 'Settings › Contact & legal',
    href: '/admin/settings#contact',
  },
];
