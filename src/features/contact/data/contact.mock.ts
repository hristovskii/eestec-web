import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import type { ContactPageRecord } from '../types';
import type { ContactRepository } from './contact.repository';
import { contactFixture } from './fixtures/contact';

const tables = () =>
  mockTable<{ contact: ContactPageRecord }>('contact', () => ({ contact: structuredClone(contactFixture) }));

export function createMockContactRepository(): ContactRepository {
  const db = tables();
  return {
    get() {
      return Promise.resolve(structuredClone(db.contact));
    },
    save(input) {
      db.contact = structuredClone(input);
      return Promise.resolve(structuredClone(db.contact));
    },
  };
}
