import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import type { Tables } from '@/shared/data/supabase/database.types';
import { isDataError, unwrap, unwrapMaybe } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { toJson } from '@/shared/data/supabase/json';
import type { CountryCode } from '@/shared/i18n/country';
import type { Localized } from '@/shared/types/localized';

import { adminCommitteeList, committeeByName } from '../domain/admin-list';
import type { Committee, CommitteeInput } from '../types';
import type { CommitteesRepository } from './committees.repository';

type Row = Tables<'committees'>;

const toCommittee = (row: Row): Committee => ({
  id: row.id,
  name: row.name,
  status: row.status,
  city: row.city as Localized,
  country: row.country as CountryCode,
  lat: row.lat,
  lng: row.lng,
  url: row.url,
  isHome: row.is_home,
});

const columns = (input: CommitteeInput) => ({
  name: input.name.trim(),
  status: input.status,
  city: toJson(input.city),
  country: input.country,
  lat: input.lat,
  lng: input.lng,
  url: input.url,
});

/**
 * The map's committees (`committees`, M19b). Everyone reads; staff write. The home flag moves only through
 * `set_home_committee` and a home committee cannot be deleted. Name and country are unique (`lower(name)`).
 * About sixty rows, so the admin list filters in memory like the mock does (`adminCommitteeList`).
 */
export function createSupabaseCommitteesRepository(client: DbClient): CommitteesRepository {
  const all = async () => unwrap(await client.from('committees').select('*')).map(toCommittee);

  return {
    async list() {
      return (await all()).sort(committeeByName);
    },

    async adminList(query) {
      return adminCommitteeList(await all(), query);
    },

    async get(id) {
      if (!isUuid(id)) return null;
      const row = unwrapMaybe(await client.from('committees').select('*').eq('id', id).maybeSingle());
      return row ? toCommittee(row) : null;
    },

    async save(input, id) {
      let wasHome = false;
      if (id !== undefined) {
        if (!isUuid(id)) return { status: 'not_found' };
        const existing = unwrapMaybe(
          await client.from('committees').select('id, is_home').eq('id', id).maybeSingle(),
        );
        if (!existing) return { status: 'not_found' };
        wasHome = existing.is_home;
      }
      let savedId: string;
      try {
        if (id === undefined) {
          savedId = unwrap(await client.from('committees').insert(columns(input)).select('id').single()).id;
        } else {
          unwrap(await client.from('committees').update(columns(input)).eq('id', id));
          savedId = id;
        }
      } catch (error) {
        if (isDataError(error, 'conflict')) return { status: 'duplicate' };
        throw error;
      }
      // The one that is ours stays ours until another is marked.
      if (input.isHome && !wasHome) unwrap(await client.rpc('set_home_committee', { p_id: savedId }));
      const row = unwrap(await client.from('committees').select('*').eq('id', savedId).single());
      return { status: 'saved', committee: toCommittee(row) };
    },

    async remove(ids) {
      const known = ids.filter(isUuid);
      if (known.length === 0) return { removed: [], keptHome: false };
      const homes = unwrap(await client.from('committees').select('id').in('id', known).eq('is_home', true));
      const removed = unwrap(
        await client.from('committees').delete().in('id', known).eq('is_home', false).select('id'),
      );
      return { removed: removed.map((row) => row.id), keptHome: homes.length > 0 };
    },

    async importMany(rows) {
      const items = rows.map((row) => ({ ...columns(row) }));
      const result = unwrap(await client.rpc('import_committees', { p_items: toJson(items) }));
      return result as { created: number; updated: number };
    },
  };
}
