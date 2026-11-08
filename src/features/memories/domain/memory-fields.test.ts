import { describe, expect, it } from 'vitest';

import type { MemoryContent } from '../types';
import { changesBetween } from './memory-changes';
import { excerptOf, readMinutes, submitProblems } from './memory-fields';
import { placeLabel, samePlace } from './memory-place';
import { memorySlug } from './memory-slug';

const base: MemoryContent = {
  title: 'A title',
  eventId: 'ev-1',
  otherEventName: '',
  city: 'Skopje',
  country: 'North Macedonia',
  happenedOn: null,
  body: '<p>Some words here.</p>',
  cover: { fileId: null, sample: 'x', alt: 'Alt', credit: '' },
  photos: [],
};

describe('submitProblems', () => {
  it('accepts a complete Memory', () => {
    expect(submitProblems(base)).toEqual([]);
  });

  it('lists what is missing, and counts photos without alt text', () => {
    expect(
      submitProblems({
        ...base,
        title: ' ',
        eventId: null,
        city: '',
        body: '<p></p>',
        cover: { fileId: null, sample: null, alt: '', credit: '' },
        photos: [
          { id: 'a', fileId: null, sample: null, alt: '', caption: '' },
          { id: 'b', fileId: null, sample: null, alt: 'ok', caption: '' },
          { id: 'c', fileId: null, sample: null, alt: '  ', caption: '' },
        ],
      }),
    ).toEqual([
      { field: 'title' },
      { field: 'event' },
      { field: 'place' },
      { field: 'text' },
      { field: 'coverAlt' },
      { field: 'photoAlt', count: 2 },
    ]);
  });

  it('"Other" with a name counts as an event; no cover is its own problem', () => {
    expect(submitProblems({ ...base, eventId: null, otherEventName: 'Trip', cover: null })).toEqual([
      { field: 'cover' },
    ]);
  });
});

describe('text helpers', () => {
  it('reads at 200 words a minute, at least one minute', () => {
    expect(readMinutes(0)).toBe(1);
    expect(readMinutes(200)).toBe(1);
    expect(readMinutes(412)).toBe(3);
  });

  it('cuts an excerpt at a word and strips tags and entities', () => {
    expect(excerptOf('<p>Short &amp; sweet.</p>')).toBe('Short & sweet.');
    const long = `<p>${'word '.repeat(80)}</p>`;
    const cut = excerptOf(long, 60);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(61);
    expect(cut).not.toMatch(/wor…$/);
  });

  it('joins the place and compares it without case', () => {
    expect(placeLabel(' Tallinn ', 'Estonia')).toBe('Tallinn, Estonia');
    expect(placeLabel('Tallinn', '')).toBe('Tallinn');
    expect(samePlace('tallinn, estonia', 'Tallinn, Estonia ')).toBe(true);
  });
});

describe('changesBetween', () => {
  it('names what a revision changes', () => {
    expect(changesBetween(base, base)).toEqual([]);
    expect(
      changesBetween(base, {
        ...base,
        title: 'New',
        body: '<p>x</p>',
        city: 'Ohrid',
        happenedOn: '2026-01-01',
      }),
    ).toEqual(['title', 'text', 'place', 'date']);
    expect(
      changesBetween(base, {
        ...base,
        photos: [{ id: 'a', fileId: 'f', sample: null, alt: 'a', caption: '' }],
        eventId: null,
        otherEventName: 'Trip',
      }),
    ).toEqual(['photos', 'event']);
  });
});

describe('memorySlug', () => {
  it('makes an address from the title and avoids taken and reserved ones', () => {
    expect(memorySlug('Five days in Delft!', () => false)).toBe('five-days-in-delft');
    expect(memorySlug('Five days in Delft!', (slug) => slug === 'five-days-in-delft')).toBe(
      'five-days-in-delft-2',
    );
    expect(memorySlug('New', () => false)).toBe('new-2');
    expect(memorySlug('???', () => false)).toBe('memory');
  });
});
