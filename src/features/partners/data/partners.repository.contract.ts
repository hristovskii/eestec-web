import { describe, expect, it } from 'vitest';

import type { Sponsor } from '../types';
import type { PartnersRepository } from './partners.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test puts the content back.

const both = (text: string) => ({ mk: text, en: text });

export function describePartnersRepository(
  name: string,
  createRepo: () => PartnersRepository | Promise<PartnersRepository>,
) {
  describe(`PartnersRepository (${name})`, () => {
    it('has content to start with: the page, tiers and sponsors in a tier', async () => {
      const repo = await createRepo();
      const page = await repo.getPage();
      const tiers = await repo.listTiers();
      const sponsors = await repo.listSponsors();
      expect(page.hero.title.mk).not.toBe('');
      expect(page.packages.items.length).toBeGreaterThan(0);
      expect(tiers.length).toBeGreaterThan(0);
      expect(sponsors.length).toBeGreaterThan(0);
      const tierIds = new Set(tiers.map((tier) => tier.id));
      expect(sponsors.every((sponsor) => tierIds.has(sponsor.tierId))).toBe(true);
    });

    it('saves the page as given and returns the stored result', async () => {
      const repo = await createRepo();
      const before = await repo.getPage();
      try {
        const saved = await repo.savePage({
          ...before,
          hero: { ...before.hero, title: both('A new title') },
        });
        expect(saved.hero.title.mk).toBe('A new title');
        expect((await repo.getPage()).hero.title.mk).toBe('A new title');
      } finally {
        await repo.savePage(before);
      }
      expect(await repo.getPage()).toEqual(before);
    });

    it('creates, updates and removes a sponsor; a new one goes last', async () => {
      const repo = await createRepo();
      const tier = (await repo.listTiers())[0]!;
      const input: Omit<Sponsor, 'id'> = {
        name: 'Contract Test Ltd',
        logo: null,
        websiteUrl: 'https://contract.example.com',
        tierId: tier.id,
        activeFrom: '',
        activeTo: '',
        isActive: true,
      };
      const created = await repo.saveSponsor(input);
      if (created.status !== 'ok') throw new Error('not created');
      try {
        expect((await repo.listSponsors()).at(-1)?.id).toBe(created.sponsor.id);
        const updated = await repo.saveSponsor(
          { ...input, name: 'Renamed Ltd', isActive: false },
          created.sponsor.id,
        );
        expect(updated).toMatchObject({ status: 'ok', sponsor: { name: 'Renamed Ltd', isActive: false } });
        expect((await repo.getSponsor(created.sponsor.id))?.name).toBe('Renamed Ltd');
        expect(await repo.saveSponsor(input, 'does-not-exist')).toEqual({ status: 'not_found' });
        expect(await repo.saveSponsor({ ...input, tierId: 'no-such-tier' })).toEqual({ status: 'no_tier' });
      } finally {
        expect(await repo.removeSponsor(created.sponsor.id)).toBe(true);
      }
      expect(await repo.getSponsor(created.sponsor.id)).toBeNull();
      expect(await repo.removeSponsor(created.sponsor.id)).toBe(false);
    });

    it('reorders the sponsors of one tier and leaves the others where they are', async () => {
      const repo = await createRepo();
      const before = await repo.listSponsors();
      const tierId = before.find(
        (sponsor) => before.filter((other) => other.tierId === sponsor.tierId).length > 1,
      )!.tierId;
      const ids = before.filter((sponsor) => sponsor.tierId === tierId).map((sponsor) => sponsor.id);
      try {
        expect(await repo.reorderSponsors(tierId, [...ids].reverse())).toBe(true);
        const after = await repo.listSponsors();
        expect(after.filter((sponsor) => sponsor.tierId === tierId).map((sponsor) => sponsor.id)).toEqual(
          [...ids].reverse(),
        );
        expect(after.filter((sponsor) => sponsor.tierId !== tierId)).toEqual(
          before.filter((sponsor) => sponsor.tierId !== tierId),
        );
        // A list that is not exactly the tier's sponsors changes nothing.
        expect(await repo.reorderSponsors(tierId, ids.slice(1))).toBe(false);
      } finally {
        await repo.reorderSponsors(tierId, ids);
      }
      expect(await repo.listSponsors()).toEqual(before);
    });

    it('saves tiers in the given order, but not without a tier that still has sponsors', async () => {
      const repo = await createRepo();
      const before = await repo.listTiers();
      const sponsors = await repo.listSponsors();
      const empty = before.find((tier) => !sponsors.some((sponsor) => sponsor.tierId === tier.id));
      const used = before.find((tier) => sponsors.some((sponsor) => sponsor.tierId === tier.id))!;
      try {
        const reversed = await repo.saveTiers([...before].reverse());
        expect(reversed.status === 'ok' && reversed.tiers.map((tier) => tier.id)).toEqual(
          [...before].reverse().map((tier) => tier.id),
        );
        const blocked = await repo.saveTiers(before.filter((tier) => tier.id !== used.id));
        expect(blocked).toEqual({ status: 'in_use', tierIds: [used.id] });
        if (empty) {
          const without = await repo.saveTiers(before.filter((tier) => tier.id !== empty.id));
          expect(without.status).toBe('ok');
        }
      } finally {
        await repo.saveTiers(before);
      }
      expect(await repo.listTiers()).toEqual(before);
    });
  });
}
