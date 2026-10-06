import { describe, expect, it } from 'vitest';

import { archiveHref, archiveParamsSchema } from './archive-params.schema';

describe('archive params', () => {
  it('falls back to defaults for invalid values', () => {
    expect(
      archiveParamsSchema.parse({ tab: 'nope', sort: 'x', page: '-3', year: 'abc', type: 'Bad Type' }),
    ).toEqual({
      tab: 'local',
      sort: 'newest',
      page: 1,
      year: undefined,
      type: undefined,
      q: undefined,
    });
  });

  it('builds clean addresses: defaults left out, filters reset the page', () => {
    const params = archiveParamsSchema.parse({ tab: 'international', type: 'workshop', page: '3' });
    expect(archiveHref(params, { page: 4 })).toBe('/events?tab=international&type=workshop&page=4');
    expect(archiveHref(params, { type: null })).toBe('/events?tab=international');
    expect(archiveHref(archiveParamsSchema.parse({}), { page: 1 })).toBe('/events');
    expect(archiveHref(params, { tab: 'local', q: 'robot' })).toBe('/events?type=workshop&q=robot');
  });
});
