import { describe, expect, it } from 'vitest';

import type { CommitteeInput } from '../types';
import type { CommitteesRepository } from './committees.repository';

// Runs against every implementation (mock now, Supabase in M20). Each test creates what it
// changes, with names of its own.

const unique = () => crypto.randomUUID().slice(0, 8);

const input = (patch: Partial<CommitteeInput> = {}): CommitteeInput => ({
  name: `LC Test ${unique()}`,
  status: 'lc',
  city: { mk: 'Testville' },
  country: 'RS',
  lat: 44.8,
  lng: 20.4,
  url: '',
  isHome: false,
  ...patch,
});

const query = (patch = {}) => ({ sort: 'name' as const, page: 1, pageSize: 100, ...patch });

export function describeCommitteesRepository(
  name: string,
  createRepo: () => CommitteesRepository | Promise<CommitteesRepository>,
) {
  describe(`CommitteesRepository (${name})`, () => {
    it('lists every committee by name, with exactly one of them ours', async () => {
      const repo = await createRepo();
      const all = await repo.list();
      expect(all.length).toBeGreaterThan(0);
      expect(all.map((item) => item.name)).toEqual(
        [...all.map((item) => item.name)].sort((a, b) => a.localeCompare(b, 'en')),
      );
      expect(all.filter((item) => item.isHome)).toHaveLength(1);
    });

    it('creates, reads, updates and refuses a second committee with the same name and country', async () => {
      const repo = await createRepo();
      const made = await repo.save(input({ name: `LC Made ${unique()}` }));
      if (made.status !== 'saved') throw new Error('not saved');
      const id = made.committee.id;
      expect((await repo.get(id))?.city).toEqual({ mk: 'Testville' });

      const updated = await repo.save({ ...made.committee, city: { mk: 'Renamed' }, lat: 1 }, id);
      expect(updated).toMatchObject({ status: 'saved', committee: { id, city: { mk: 'Renamed' }, lat: 1 } });

      expect(await repo.save(input({ name: made.committee.name.toUpperCase() }))).toEqual({
        status: 'duplicate',
      });
      // The same name in another country is another committee.
      expect((await repo.save(input({ name: made.committee.name, country: 'HR' }))).status).toBe('saved');
      expect(await repo.save(input(), 'unknown')).toEqual({ status: 'not_found' });
      expect(await repo.get('unknown')).toBeNull();
    });

    it('moves the highlight when another committee is marked as ours, and never loses it', async () => {
      const repo = await createRepo();
      const before = (await repo.list()).find((item) => item.isHome)!;
      const made = await repo.save(input({ isHome: true }));
      if (made.status !== 'saved') throw new Error('not saved');
      let homes = (await repo.list()).filter((item) => item.isHome);
      expect(homes.map((item) => item.id)).toEqual([made.committee.id]);

      // Un-marking the one that is ours does nothing: another has to be marked.
      await repo.save({ ...made.committee, isHome: false }, made.committee.id);
      homes = (await repo.list()).filter((item) => item.isHome);
      expect(homes.map((item) => item.id)).toEqual([made.committee.id]);

      // Put it back for the other tests.
      await repo.save({ ...before, isHome: true }, before.id);
      expect((await repo.list()).find((item) => item.isHome)?.id).toBe(before.id);
    });

    it('filters, searches and sorts the admin list, with counts per type', async () => {
      const repo = await createRepo();
      const marker = unique();
      await repo.save(input({ name: `LC Zed ${marker}`, status: 'lc', country: 'IS' }));
      await repo.save(input({ name: `Observer Abe ${marker}`, status: 'observer', country: 'IS' }));
      await repo.save(
        input({ name: `JLC Mid ${marker}`, status: 'jlc', country: 'IS', city: { mk: `Mid${marker}` } }),
      );

      const all = await repo.adminList(query({ q: marker }));
      expect(all.items.map((item) => item.name)).toEqual([
        `JLC Mid ${marker}`,
        `LC Zed ${marker}`,
        `Observer Abe ${marker}`,
      ]);
      expect(all.counts).toEqual({ all: 3, lc: 1, observer: 1, jlc: 1 });

      const observers = await repo.adminList(query({ q: marker, status: 'observer' }));
      expect(observers.items).toHaveLength(1);
      // Counts ignore the type filter.
      expect(observers.counts.all).toBe(3);

      const reversed = await repo.adminList(query({ q: marker, sort: '-name' }));
      expect(reversed.items[0]?.name).toBe(`Observer Abe ${marker}`);
      // The search also matches the city and the country name.
      expect((await repo.adminList(query({ q: `mid${marker}` }))).total).toBe(1);
      expect(
        (await repo.adminList(query({ q: 'iceland' }))).items.every((item) => item.country === 'IS'),
      ).toBe(true);
      const iceland = await repo.adminList(query({ country: 'IS' }));
      expect(iceland.countries).toContain('IS');
      const paged = await repo.adminList(query({ q: marker, pageSize: 2 }));
      expect(paged).toMatchObject({ total: 3, pageCount: 2 });
    });

    it('deletes committees, but keeps the one that is ours', async () => {
      const repo = await createRepo();
      const a = await repo.save(input());
      const home = (await repo.list()).find((item) => item.isHome)!;
      if (a.status !== 'saved') throw new Error('not saved');
      const result = await repo.remove([a.committee.id, home.id, 'unknown']);
      expect(result).toEqual({ removed: [a.committee.id], keptHome: true });
      expect(await repo.get(a.committee.id)).toBeNull();
      expect(await repo.get(home.id)).not.toBeNull();
    });

    it('imports: adds new committees, updates the same name and country, never moves the highlight', async () => {
      const repo = await createRepo();
      const fresh = input({ name: `LC Import ${unique()}` });
      const first = await repo.importMany([fresh, input({ name: `LC Import ${unique()}` })]);
      expect(first).toEqual({ created: 2, updated: 0 });
      const again = await repo.importMany([{ ...fresh, city: { mk: 'Changed' }, isHome: true }]);
      expect(again).toEqual({ created: 0, updated: 1 });
      const found = (await repo.list()).find((item) => item.name === fresh.name)!;
      expect(found).toMatchObject({ city: { mk: 'Changed' }, isHome: false });
      expect((await repo.list()).filter((item) => item.isHome)).toHaveLength(1);
    });
  });
}
