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
      db.form = structuredClone(input);
      return Promise.resolve(structuredClone(db.form));
    },
  };
}
