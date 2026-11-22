import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import type { IdeaFormSettings } from '../types';
import { formFixture } from './fixtures/form';
import type { IdeaFormRepository } from './form.repository';

const tables = () =>
  mockTable<{ form: IdeaFormSettings }>('idea-form', () => ({ form: structuredClone(formFixture) }));

export function createMockIdeaFormRepository(): IdeaFormRepository {
  const db = tables();
  return {
    get: () => Promise.resolve(structuredClone(db.form)),
    save(input) {
      // A new type comes without an id: the store gives it one (a database does the same).
      db.form = structuredClone({
        ...input,
        types: input.types.map((type) => ({
          ...type,
          id: type.id || `itype-${crypto.randomUUID().slice(0, 8)}`,
        })),
      });
      return Promise.resolve(structuredClone(db.form));
    },
  };
}
