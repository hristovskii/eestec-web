import { describe, expect, it } from 'vitest';

import { privacyInputSchema } from './privacy.schema';

const valid = {
  title: { mk: 'Политика за приватност', en: 'Privacy policy' },
  body: { mk: '<p>Текст</p>', en: '<p>Text</p>' },
  isPlaceholder: false,
};

const issues = (input: unknown) => {
  const result = privacyInputSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('privacyInputSchema', () => {
  it('accepts a title and a body in Macedonian, English optional', () => {
    expect(issues(valid)).toEqual([]);
    expect(issues({ ...valid, body: { mk: '<p>Текст</p>' }, title: { mk: 'Политика' } })).toEqual([]);
  });

  it('wants Macedonian text, and an editor with only blank paragraphs is empty', () => {
    expect(issues({ ...valid, body: { mk: '<p> </p><p><br></p>' } })).toEqual(['body.mk:required']);
    expect(issues({ ...valid, title: { mk: ' ' } })).toEqual(['title.mk:required']);
  });

  it('stops a text that is far too long', () => {
    expect(issues({ ...valid, body: { mk: `<p>${'a'.repeat(60_001)}</p>` } })).toEqual(['body.mk:tooLong']);
  });
});
