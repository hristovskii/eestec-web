import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import { normalizeLayout } from '../domain/layout';
import type { HomeRecord } from '../types';
import { homeFixture } from './fixtures/home';
import type { HomeRepository } from './home.repository';

const tables = () => mockTable<{ home: HomeRecord }>('home', () => ({ home: structuredClone(homeFixture) }));

export function createMockHomeRepository(): HomeRepository {
  const db = tables();
  return {
    get() {
      return Promise.resolve(structuredClone(db.home));
    },
    save(input) {
      db.home = structuredClone({ ...input, layout: normalizeLayout(input.layout) });
      return Promise.resolve(structuredClone(db.home));
    },
  };
}
