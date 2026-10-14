import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { countryName } from '@/shared/i18n/country';
import { resolveLocalized } from '@/shared/i18n/localized';
import type { Locale } from '@/shared/i18n/routing';

import { committeeTags } from './cache-tags';
import { committeesRepository } from './data';
import type { AdminCommitteesParams } from './schemas/admin-committees-params.schema';
import type { PublicCommittee } from './types';

/** The committees of the public map and list, by name, with the country named in `locale`. Cached; every admin change refreshes it. */
export async function getCommittees(locale: Locale): Promise<PublicCommittee[]> {
  'use cache';
  cacheTag(committeeTags.all);
  cacheLife('hours');
  const committees = await (await committeesRepository()).list();
  return committees.map((committee) => ({
    ...committee,
    city: resolveLocalized(committee.city, locale),
    countryName: countryName(committee.country, locale),
  }));
}

const toQuery = (params: AdminCommitteesParams) => ({
  q: params.q,
  status: params.status,
  country: params.country,
  sort: params.sort ?? 'name',
  page: params.page,
  pageSize: params.size,
});

/** Admin › Map / Committees: one page, the counts per type, and the countries for the filter. Callers check the permission. */
export async function listAdminCommittees(params: AdminCommitteesParams) {
  const repo = await committeesRepository('session');
  const [page, everything] = await Promise.all([repo.adminList(toQuery(params)), repo.list()]);
  return {
    page,
    totals: {
      committees: everything.length,
      countries: new Set(everything.map((item) => item.country)).size,
    },
  };
}

/** Export CSV: every committee matching the filters (not just the page). */
export async function exportAdminCommittees(params: AdminCommitteesParams) {
  const repo = await committeesRepository('session');
  return (await repo.adminList({ ...toQuery(params), page: 1, pageSize: 100_000 })).items;
}
