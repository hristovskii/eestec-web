import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import type { Tables } from '@/shared/data/supabase/database.types';
import { unwrap, unwrapMaybe } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { toJson } from '@/shared/data/supabase/json';
import { readPageContent } from '@/shared/data/supabase/page-content';
import type { Localized } from '@/shared/types/localized';

import type { PartnerPackage, PartnersPageRecord, Sponsor, SponsorTier } from '../types';
import type { PartnersRepository } from './partners.repository';

type SponsorRow = Tables<'sponsors'>;

const toTier = (row: Tables<'sponsor_tiers'>): SponsorTier => ({
  id: row.id,
  name: row.name as Localized,
  size: row.size,
});

const toSponsor = (row: SponsorRow): Sponsor => ({
  id: row.id,
  name: row.name,
  logo: row.logo_media_id
    ? { mediaId: row.logo_media_id, alt: (row.logo_alt as Localized | null) ?? { mk: '' } }
    : null,
  websiteUrl: row.website_url,
  tierId: row.tier_id,
  activeFrom: row.active_from ?? '',
  activeTo: row.active_to ?? '',
  isActive: row.is_active,
});

const sponsorColumns = (input: Omit<Sponsor, 'id'>) => ({
  name: input.name,
  logo_media_id: input.logo?.mediaId ?? null,
  logo_alt: input.logo ? toJson(input.logo.alt) : null,
  website_url: input.websiteUrl,
  tier_id: input.tierId,
  active_from: input.activeFrom || null,
  active_to: input.activeTo || null,
  is_active: input.isActive,
});

/**
 * The For Companies page: its text is the `partners` page row, its packages are `partner_packages` (the
 * source of truth for the list), tiers and sponsors are their own tables. Visitors see active sponsors
 * (RLS); the board sees all. Sponsors are listed in one board order; the page groups them by tier.
 */
export function createSupabasePartnersRepository(client: DbClient): PartnersRepository {
  async function getPage(): Promise<PartnersPageRecord> {
    const content = await readPageContent<PartnersPageRecord>(client, 'partners');
    const packages = unwrap(await client.from('partner_packages').select('*').order('sort_order'));
    return {
      ...content,
      packages: {
        ...content.packages,
        items: packages.map((row): PartnerPackage => ({
          id: row.id,
          name: row.name as Localized,
          text: row.text as Localized,
          priceText: row.price_text as Localized,
          items: row.items as PartnerPackage['items'],
          highlighted: row.highlighted,
          cta: row.cta as Localized,
        })),
      },
    };
  }

  const listTiers = async () =>
    unwrap(await client.from('sponsor_tiers').select('*').order('sort_order')).map(toTier);

  return {
    getPage,

    async savePage(input) {
      const { items, ...packages } = input.packages;
      unwrap(
        await client.rpc('save_partners_page', {
          p_content: toJson({ ...input, packages: { ...packages, items: [] } }),
          p_packages: toJson(
            items.map((item) => ({
              id: item.id,
              name: item.name,
              text: item.text,
              price_text: item.priceText,
              items: item.items,
              highlighted: item.highlighted,
              cta: item.cta,
            })),
          ),
        }),
      );
      return getPage();
    },

    listTiers,

    async saveTiers(tiers) {
      const result = unwrap(await client.rpc('save_sponsor_tiers', { p_tiers: toJson(tiers) })) as {
        status: 'ok' | 'in_use';
        tier_ids?: string[];
      };
      if (result.status === 'in_use') return { status: 'in_use', tierIds: result.tier_ids ?? [] };
      return { status: 'ok', tiers: await listTiers() };
    },

    async listSponsors() {
      const rows = unwrap(await client.from('sponsors').select('*').order('sort_order').order('id'));
      return rows.map(toSponsor);
    },

    async getSponsor(id) {
      if (!isUuid(id)) return null;
      const row = unwrapMaybe(await client.from('sponsors').select('*').eq('id', id).maybeSingle());
      return row ? toSponsor(row) : null;
    },

    async saveSponsor(input, id) {
      if (!isUuid(input.tierId)) return { status: 'no_tier' };
      const tier = unwrapMaybe(
        await client.from('sponsor_tiers').select('id').eq('id', input.tierId).maybeSingle(),
      );
      if (!tier) return { status: 'no_tier' };
      if (id !== undefined) {
        if (!isUuid(id)) return { status: 'not_found' };
        const row = unwrapMaybe(
          await client.from('sponsors').update(sponsorColumns(input)).eq('id', id).select('*').maybeSingle(),
        );
        return row ? { status: 'ok', sponsor: toSponsor(row) } : { status: 'not_found' };
      }
      // No sort order given: the database puts a new sponsor last.
      const row = unwrap(await client.from('sponsors').insert(sponsorColumns(input)).select('*').single());
      return { status: 'ok', sponsor: toSponsor(row) };
    },

    async removeSponsor(id) {
      if (!isUuid(id)) return false;
      // A sponsor that events still list as a partner stays: the foreign key refuses (a DataError 'in_use').
      return unwrap(await client.from('sponsors').delete().eq('id', id).select('id')).length > 0;
    },

    async reorderSponsors(tierId, ids) {
      if (!isUuid(tierId) || !ids.every(isUuid)) return false;
      return unwrap(await client.rpc('reorder_sponsors', { p_tier: tierId, p_ids: ids })) === true;
    },
  };
}
