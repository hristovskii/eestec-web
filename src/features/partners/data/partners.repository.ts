import type { PartnersPageInput, PartnersPageRecord, Sponsor, SponsorTier } from '../types';

/**
 * The For Companies page and its logos (data-model.md: page_blocks partners, sponsor_tiers,
 * sponsors, partner_packages). Tiers and sponsors keep the order the board set.
 */
export interface PartnersRepository {
  /** The page's texts, cards and packages, in both languages. */
  getPage(): Promise<PartnersPageRecord>;
  /** Replaces everything the "Page" tab edits; returns the stored result. */
  savePage(input: PartnersPageInput): Promise<PartnersPageRecord>;

  /** Tiers in the board's order. */
  listTiers(): Promise<SponsorTier[]>;
  /** Replaces the tiers (names, sizes, order). Tiers that still have sponsors must stay. */
  saveTiers(
    tiers: SponsorTier[],
  ): Promise<{ status: 'ok'; tiers: SponsorTier[] } | { status: 'in_use'; tierIds: string[] }>;

  /** Every sponsor in the board's order, active or not. */
  listSponsors(): Promise<Sponsor[]>;
  getSponsor(id: string): Promise<Sponsor | null>;
  /** Creates (no id; goes last in its tier) or updates a sponsor. */
  saveSponsor(
    input: Omit<Sponsor, 'id'>,
    id?: string,
  ): Promise<{ status: 'ok'; sponsor: Sponsor } | { status: 'not_found' } | { status: 'no_tier' }>;
  removeSponsor(id: string): Promise<boolean>;
  /** Puts the sponsors of one tier in this order (ids of that tier only); the rest keep their place. */
  reorderSponsors(tierId: string, ids: string[]): Promise<boolean>;
}
