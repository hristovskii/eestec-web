import { describe, expect, it } from 'vitest';

import type { Profile } from '../types';
import { canSee, hasPage, isRestrictedFor } from './visibility';

const profile = (status: Profile['status'], visibility: Profile['visibility']) => ({ status, visibility });

describe('who sees which profile', () => {
  const statuses = ['active', 'alumni', 'inactive', 'hidden'] as const;

  it('shows public active and alumni profiles to everybody', () => {
    for (const status of ['active', 'alumni'] as const) {
      expect(canSee('visitor', profile(status, 'public'))).toBe(true);
      expect(canSee('member', profile(status, 'public'))).toBe(true);
    }
  });

  it('shows members-only profiles to members only', () => {
    for (const status of ['active', 'alumni'] as const) {
      expect(canSee('visitor', profile(status, 'members_only'))).toBe(false);
      expect(canSee('member', profile(status, 'members_only'))).toBe(true);
    }
  });

  it('never shows inactive or hidden profiles, to anyone', () => {
    for (const status of ['inactive', 'hidden'] as const)
      for (const visibility of ['public', 'members_only'] as const)
        for (const audience of ['visitor', 'member'] as const)
          expect(canSee(audience, profile(status, visibility))).toBe(false);
  });

  it('knows which profiles have a page at all', () => {
    expect(statuses.filter((status) => hasPage({ status }))).toEqual(['active', 'alumni']);
  });

  it('calls a members-only profile "restricted" for a visitor, and nothing else', () => {
    expect(isRestrictedFor('visitor', profile('active', 'members_only'))).toBe(true);
    expect(isRestrictedFor('member', profile('active', 'members_only'))).toBe(false);
    expect(isRestrictedFor('visitor', profile('active', 'public'))).toBe(false);
    expect(isRestrictedFor('visitor', profile('hidden', 'members_only'))).toBe(false);
  });
});
