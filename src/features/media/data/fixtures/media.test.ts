import { describe, expect, it } from 'vitest';

import { mediaFixture } from './media';

describe('media fixtures: sample sponsor logos', () => {
  const logo = (slug: string) => mediaFixture.find((item) => item.id === `media-sponsor-${slug}`)!;
  const ratio = (slug: string) => logo(slug).width! / logo(slug).height!;

  it('have the proportions of the canvas logos (the partner page sizes logos from them)', () => {
    expect(['voltline', 'gridnova', 'kodra', 'amperix', 'circuitlab', 'ferrolux'].map(ratio)).toEqual([
      4, 3, 1, 0.75, 2.5, 3.5,
    ]);
  });

  it('exist as files in public/sample, with alt text', () => {
    const sponsors = mediaFixture.filter((item) => item.id.startsWith('media-sponsor-'));
    expect(sponsors).toHaveLength(18);
    for (const item of sponsors) {
      expect(item.src, item.id).toBe(`/sample/${item.fileName}`);
      expect(item.alt, item.id).toBeTruthy();
    }
  });
});
