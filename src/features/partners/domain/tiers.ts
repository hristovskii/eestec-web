/** Logos in a row: more than this and a Home tier becomes a slowly scrolling row (PartnersStates frame). */
export const CAROUSEL_AFTER = { desktop: 6, mobile: 2 } as const;

/** Whether a tier with `count` logos is too long for one row. */
export const needsCarousel = (count: number, viewport: 'desktop' | 'mobile') =>
  count > CAROUSEL_AFTER[viewport];

/**
 * Tiers in the board's order with the sponsors of each; a tier with nobody in it is left out
 * ("A tier with no active partners is hidden", everywhere).
 */
export function groupByTier<S extends { tierId: string }, T extends { id: string }>(
  tiers: readonly T[],
  sponsors: readonly S[],
): { tier: T; sponsors: S[] }[] {
  return tiers
    .map((tier) => ({ tier, sponsors: sponsors.filter((sponsor) => sponsor.tierId === tier.id) }))
    .filter((group) => group.sponsors.length > 0);
}
