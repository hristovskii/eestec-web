import { describe, expect, it } from 'vitest';

import { LOGO_CELLS, logoSize } from './logo-size';

describe('logoSize (PartnerLogo: equal visual area, not equal height)', () => {
  const gold = LOGO_CELLS.desktop.medium;

  it('gives wide, square and tall logos about the same area', () => {
    const areas = [4, 1, 0.75].map((ratio) => {
      const { width, height } = logoSize(ratio, LOGO_CELLS.desktop.small);
      return width * height;
    });
    // Same visual area within rounding (the wide one is capped by the cell height, so a little less).
    expect(Math.max(...areas) / Math.min(...areas)).toBeLessThan(1.35);
  });

  it('matches the canvas rule (area 6000 in a 112 px gold cell, so at most 72 px high)', () => {
    // √(6000 × 2) = 110 × 55: inside both caps.
    expect(logoSize(2, gold)).toEqual({ width: 110, height: 55 });
    // A square would be 77 px, a tall one 89 px: both are cut to 72 px high.
    expect(logoSize(1, gold)).toEqual({ width: 72, height: 72 });
    expect(logoSize(0.75, gold)).toEqual({ width: 54, height: 72 });
  });

  it('never exceeds 64 % of the cell height', () => {
    const { height } = logoSize(0.1, gold);
    expect(height).toBeLessThanOrEqual(Math.round(gold.height * 0.64));
  });

  it('never exceeds the widest logo', () => {
    const { width } = logoSize(40, gold);
    expect(width).toBeLessThanOrEqual(gold.maxWidth);
  });

  it('treats a missing or broken ratio as square', () => {
    expect(logoSize(0, gold)).toEqual(logoSize(1, gold));
    expect(logoSize(Number.NaN, gold)).toEqual(logoSize(1, gold));
    expect(logoSize(Infinity, gold)).toEqual(logoSize(1, gold));
  });
});
