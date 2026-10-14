import type { TierSize } from '../types';

/** The cell a logo sits in and the visual area it may take (PartnerLogos frame, desktop and phone). */
export type LogoCell = {
  /** Cell width in px; null: the cell is as wide as the layout makes it. */
  width: number | null;
  height: number;
  /** Widest the logo itself may be. */
  maxWidth: number;
  /** Visual area in px²: wide wordmarks and square marks look equally big. */
  area: number;
};

export const LOGO_CELLS: Record<'desktop' | 'mobile', Record<TierSize, LogoCell>> = {
  desktop: {
    large: { width: 360, height: 140, maxWidth: 300, area: 12_000 },
    medium: { width: 240, height: 112, maxWidth: 192, area: 6000 },
    small: { width: 176, height: 88, maxWidth: 140, area: 3000 },
  },
  mobile: {
    large: { width: null, height: 120, maxWidth: 260, area: 9000 },
    medium: { width: null, height: 84, maxWidth: 92, area: 2600 },
    small: { width: null, height: 72, maxWidth: 92, area: 1800 },
  },
};

/**
 * Size of a logo with the proportions `ratio` (width ÷ height) in `cell`: the same visual area for
 * every shape, `w = √(area × ratio)`, then capped at 64 % of the cell height and at the logo's
 * widest (PartnerLogo frame). The board only uploads the file; the site reads its proportions.
 */
export function logoSize(ratio: number, cell: LogoCell): { width: number; height: number } {
  const r = ratio > 0 && Number.isFinite(ratio) ? ratio : 1;
  const maxHeight = Math.round(cell.height * 0.64);
  let width = Math.sqrt(cell.area * r);
  let height = width / r;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * r;
  }
  if (width > cell.maxWidth) {
    width = cell.maxWidth;
    height = width / r;
  }
  return { width: Math.round(width), height: Math.round(height) };
}
