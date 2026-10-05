import { describe, expect, it } from 'vitest';

import type { AdminRole } from '../types';
import { accessTo, type Actor, ADMIN_AREAS, type AdminArea, can, isStaff } from './permissions';

const actor = (adminRole: AdminRole | null, managedEventIds: string[] = []): Actor => ({
  adminRole,
  userId: 'u-1',
  managedEventIds,
});

// The approved matrix (D18), row by row: super admin, editor, event manager. Members have no access.
const MATRIX: [AdminArea, string, string, string][] = [
  ['dashboard', 'full', 'full', 'own'],
  ['events', 'full', 'full', 'own'],
  ['eventTypes', 'full', 'full', 'none'],
  ['applications', 'full', 'full', 'own'],
  ['approvals', 'full', 'full', 'none'],
  ['inbox', 'full', 'full', 'none'],
  ['ideas', 'full', 'full', 'ownRead'],
  ['pages', 'full', 'full', 'none'],
  ['members', 'full', 'full', 'none'],
  ['memories', 'full', 'full', 'none'],
  ['media', 'full', 'full', 'own'],
  ['cvExport', 'full', 'full', 'none'],
  ['activityLog', 'full', 'read', 'none'],
  ['settings', 'full', 'none', 'none'],
  ['adminUsers', 'full', 'none', 'none'],
];

describe('permissions matrix (D18)', () => {
  it('covers every admin area exactly once', () => {
    expect(MATRIX.map(([area]) => area).sort()).toEqual([...ADMIN_AREAS].sort());
  });

  it.each(MATRIX)('%s: super admin %s, editor %s, event manager %s', (area, superAdmin, editor, manager) => {
    expect(accessTo(actor('super_admin'), area)).toBe(superAdmin);
    expect(accessTo(actor('editor'), area)).toBe(editor);
    expect(accessTo(actor('event_manager'), area)).toBe(manager);
    expect(accessTo(actor(null), area)).toBe('none');
    expect(accessTo(null, area)).toBe('none');
  });
});

describe('can()', () => {
  const manager = actor('event_manager', ['ev-ai-edge']);

  it('lets event managers edit and publish only assigned events', () => {
    expect(can(manager, 'edit', 'events', { eventId: 'ev-ai-edge' })).toBe(true);
    expect(can(manager, 'publish', 'events', { eventId: 'ev-ai-edge' })).toBe(true);
    expect(can(manager, 'edit', 'events', { eventId: 'ev-other' })).toBe(false);
  });

  it('never lets event managers create or delete events', () => {
    expect(can(manager, 'create', 'events')).toBe(false);
    expect(can(manager, 'delete', 'events', { eventId: 'ev-ai-edge' })).toBe(false);
  });

  it('scopes applications to assigned events', () => {
    expect(can(manager, 'view', 'applications')).toBe(true);
    expect(can(manager, 'edit', 'applications', { eventId: 'ev-ai-edge' })).toBe(true);
    expect(can(manager, 'edit', 'applications', { eventId: 'ev-other' })).toBe(false);
  });

  it('gives event managers read-only feedback for their events', () => {
    expect(can(manager, 'view', 'ideas', { eventId: 'ev-ai-edge' })).toBe(true);
    expect(can(manager, 'view', 'ideas', { eventId: 'ev-other' })).toBe(false);
    expect(can(manager, 'edit', 'ideas', { eventId: 'ev-ai-edge' })).toBe(false);
  });

  it('limits media for event managers to their own uploads', () => {
    expect(can(manager, 'create', 'media')).toBe(true);
    expect(can(manager, 'edit', 'media', { ownerId: 'u-1' })).toBe(true);
    expect(can(manager, 'edit', 'media', { ownerId: 'u-2' })).toBe(false);
  });

  it('makes the activity log read-only for editors', () => {
    expect(can(actor('editor'), 'view', 'activityLog')).toBe(true);
    expect(can(actor('editor'), 'edit', 'activityLog')).toBe(false);
  });

  it('keeps settings and admin users for super admins', () => {
    for (const area of ['settings', 'adminUsers'] as const) {
      expect(can(actor('super_admin'), 'edit', area)).toBe(true);
      expect(can(actor('editor'), 'view', area)).toBe(false);
    }
  });

  it('denies members and visitors everything', () => {
    for (const area of ADMIN_AREAS) {
      expect(can(actor(null), 'view', area)).toBe(false);
      expect(can(null, 'view', area)).toBe(false);
    }
    expect(isStaff(actor(null))).toBe(false);
    expect(isStaff(actor('event_manager'))).toBe(true);
  });
});
