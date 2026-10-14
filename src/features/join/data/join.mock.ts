import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import type { JoinRecord } from '../types';
import { joinFixture } from './fixtures/join';
import type { JoinRepository } from './join.repository';

const tables = () => mockTable<{ join: JoinRecord }>('join', () => ({ join: structuredClone(joinFixture) }));

export function createMockJoinRepository(): JoinRepository {
  const db = tables();
  return {
    get() {
      return Promise.resolve(structuredClone(db.join));
    },
    save(input) {
      db.join = structuredClone(input);
      return Promise.resolve(structuredClone(db.join));
    },
  };
}
