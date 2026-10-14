import { describe, expect, it } from 'vitest';

import { isMemberPath, publicButton } from './phase';

describe('Phase 1 hides links to member pages', () => {
  it('recognises the pages that need member accounts', () => {
    for (const href of ['/members', '/members#teams', '/members?group=alumni', '/memories', '/submit'])
      expect(isMemberPath(href), href).toBe(true);
    for (const href of [
      '/join',
      '/upcoming?scope=international',
      '/membership',
      'https://eestec.net/members',
    ])
      expect(isMemberPath(href), href).toBe(false);
  });

  it('drops such a button in Phase 1 and keeps it in Phase 2', () => {
    const button = { label: 'Meet the teams', href: '/members#teams' };
    expect(publicButton(button, false)).toBeNull();
    expect(publicButton(button, true)).toBe(button);
    const join = { label: 'Join', href: '/join' };
    expect(publicButton(join, false)).toBe(join);
  });
});
