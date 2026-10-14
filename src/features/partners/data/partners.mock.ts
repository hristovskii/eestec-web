import 'server-only';

import { mockTable } from '@/shared/data/mock/store';

import type { PartnersPageRecord, Sponsor, SponsorTier } from '../types';
import { partnersPageFixture, sponsorsFixture, tiersFixture } from './fixtures/partners';
import type { PartnersRepository } from './partners.repository';

type Tables = { page: PartnersPageRecord; tiers: SponsorTier[]; sponsors: Sponsor[]; nextId: number };

const tables = () =>
  mockTable<Tables>('partners', () => ({
    page: structuredClone(partnersPageFixture),
    tiers: structuredClone(tiersFixture),
    sponsors: structuredClone(sponsorsFixture),
    nextId: 1,
  }));

export function createMockPartnersRepository(): PartnersRepository {
  const db = tables();
  return {
    getPage() {
      return Promise.resolve(structuredClone(db.page));
    },
    savePage(input) {
      db.page = structuredClone(input);
      return Promise.resolve(structuredClone(db.page));
    },

    listTiers() {
      return Promise.resolve(structuredClone(db.tiers));
    },
    saveTiers(tiers) {
      const kept = new Set(tiers.map((tier) => tier.id));
      const inUse = [...new Set(db.sponsors.map((sponsor) => sponsor.tierId))].filter((id) => !kept.has(id));
      if (inUse.length > 0) return Promise.resolve({ status: 'in_use' as const, tierIds: inUse });
      db.tiers = structuredClone(tiers);
      return Promise.resolve({ status: 'ok' as const, tiers: structuredClone(db.tiers) });
    },

    listSponsors() {
      return Promise.resolve(structuredClone(db.sponsors));
    },
    getSponsor(id) {
      const sponsor = db.sponsors.find((item) => item.id === id);
      return Promise.resolve(sponsor ? structuredClone(sponsor) : null);
    },
    saveSponsor(input, id) {
      if (!db.tiers.some((tier) => tier.id === input.tierId))
        return Promise.resolve({ status: 'no_tier' as const });
      if (id) {
        const index = db.sponsors.findIndex((item) => item.id === id);
        if (index < 0) return Promise.resolve({ status: 'not_found' as const });
        const sponsor = { ...structuredClone(input), id };
        db.sponsors[index] = sponsor;
        return Promise.resolve({ status: 'ok' as const, sponsor: structuredClone(sponsor) });
      }
      const sponsor: Sponsor = { ...structuredClone(input), id: `sponsor-new-${db.nextId++}` };
      db.sponsors.push(sponsor);
      return Promise.resolve({ status: 'ok' as const, sponsor: structuredClone(sponsor) });
    },
    removeSponsor(id) {
      const before = db.sponsors.length;
      db.sponsors = db.sponsors.filter((item) => item.id !== id);
      return Promise.resolve(db.sponsors.length < before);
    },
    reorderSponsors(tierId, ids) {
      const inTier = db.sponsors.filter((item) => item.tierId === tierId);
      if (ids.length !== inTier.length || !inTier.every((item) => ids.includes(item.id)))
        return Promise.resolve(false);
      const byId = new Map(inTier.map((item) => [item.id, item]));
      let next = 0;
      // The tier's sponsors keep their slots in the list, in the new order.
      db.sponsors = db.sponsors.map((item) => (item.tierId === tierId ? byId.get(ids[next++]!)! : item));
      return Promise.resolve(true);
    },
  };
}
