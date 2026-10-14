import { describe, expect, it } from 'vitest';

import { joinFixture } from '../data/fixtures/join';
import { joinInputSchema } from './join.schema';

const valid = () => structuredClone(joinFixture);
const firstError = (input: unknown) => {
  const result = joinInputSchema.safeParse(input);
  return result.success
    ? null
    : `${result.error.issues[0]!.path.join('.')}:${result.error.issues[0]!.message}`;
};

describe('joinInputSchema', () => {
  it('accepts the sample content', () => {
    expect(firstError(valid())).toBeNull();
  });

  it('needs the Macedonian text of a FAQ item, not the English one', () => {
    const join = valid();
    join.faq[0]!.question = { mk: ' ', en: 'Question?' };
    expect(firstError(join)).toBe('faq.0.question.mk:required');
  });

  it('keeps the form usable: at least one faculty, interest and way of hearing', () => {
    for (const key of ['faculties', 'interests', 'heardFrom'] as const) {
      const join = valid();
      join.apply[key] = [];
      expect(firstError(join), key).toBe(`apply.${key}:tooFew`);
    }
  });

  it('limits the lists', () => {
    const join = valid();
    join.steps = Array.from({ length: 7 }, (_, index) => ({ ...valid().steps[0]!, id: `s-${index}` }));
    expect(firstError(join)).toBe('steps:tooMany');
  });

  it('wants a file for every document', () => {
    const join = valid();
    join.documents[0]!.mediaId = '';
    expect(firstError(join)).toBe('documents.0.mediaId:required');
  });
});
