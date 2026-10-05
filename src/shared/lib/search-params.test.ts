import { describe, expect, it } from 'vitest';

import { hrefWithParams } from './search-params';

describe('hrefWithParams', () => {
  it('sets and removes params and returns to page 1', () => {
    expect(hrefWithParams('/admin/events', 'q=ai&page=3', { status: 'draft' })).toBe(
      '/admin/events?q=ai&status=draft',
    );
    expect(hrefWithParams('/admin/events', 'q=ai&page=3', { q: '' })).toBe('/admin/events');
  });

  it('keeps the other params when only the page changes', () => {
    expect(hrefWithParams('/admin/events', 'q=ai&page=3', { page: '4' })).toBe('/admin/events?q=ai&page=4');
    expect(hrefWithParams('/admin/events', 'q=ai&page=3', { page: null })).toBe('/admin/events?q=ai');
  });

  it('can keep the page (e.g. selection-only changes)', () => {
    expect(hrefWithParams('/x', 'page=2', { tab: 'a' }, { resetPage: false })).toBe('/x?page=2&tab=a');
  });
});
