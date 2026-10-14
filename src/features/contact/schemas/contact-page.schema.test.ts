import { describe, expect, it } from 'vitest';

import { contactFixture } from '../data/fixtures/contact';
import { contactPageSchema } from './contact-page.schema';

const issues = (input: unknown) => {
  const result = contactPageSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('contactPageSchema', () => {
  it('accepts the sample content', () => {
    expect(issues(contactFixture)).toEqual([]);
  });

  it('wants a Macedonian title, a route e-mail and at least one subject', () => {
    const broken = structuredClone(contactFixture);
    broken.hero.title.mk = ' ';
    broken.subjects[0]!.routeEmail = 'not-an-email';
    expect(issues(broken)).toEqual(
      expect.arrayContaining(['hero.title.mk:required', 'subjects.0.routeEmail:email']),
    );
    expect(issues({ ...contactFixture, subjects: [] })).toContain('subjects:tooFew');
  });

  it('keeps a shortcut link and its words together', () => {
    const noWords = structuredClone(contactFixture);
    noWords.subjects[1]!.shortcutLabel = { mk: '' };
    expect(issues(noWords)).toContain('subjects.1.shortcutLabel.mk:required');
    const noLink = structuredClone(contactFixture);
    noLink.subjects[1]!.shortcutUrl = '';
    expect(issues(noLink)).toContain('subjects.1.shortcutUrl:required');
    const neither = structuredClone(contactFixture);
    neither.subjects[1]!.shortcutUrl = '';
    neither.subjects[1]!.shortcutLabel = { mk: '' };
    expect(issues(neither)).toEqual([]);
  });

  it('takes site pages and https links only', () => {
    const bad = structuredClone(contactFixture);
    bad.subjects[1]!.shortcutUrl = 'http://example.org';
    bad.shortcuts[0]!.href = '//evil.example';
    expect(issues(bad)).toEqual(
      expect.arrayContaining(['subjects.1.shortcutUrl:url', 'shortcuts.0.href:url']),
    );
  });

  it('checks the map position', () => {
    const bad = structuredClone(contactFixture);
    bad.map.lat = 120;
    bad.map.zoom = 30;
    bad.map.lng = Number.NaN;
    expect(issues(bad)).toEqual(
      expect.arrayContaining(['map.lat:range', 'map.zoom:range', 'map.lng:number']),
    );
  });
});
