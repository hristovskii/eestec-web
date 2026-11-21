import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedId } from '../../../../scripts/generate-seed';
import { anonClient, createTestUser } from '../../../../tests/supabase/harness';
import {
  describeEventsRepository,
  describeEventTaxonomyRepository,
  setContractEditor,
  setContractOptions,
  setFixtureIds,
} from './events.repository.contract';
import { createSupabaseEventsRepository, createSupabaseEventTaxonomyRepository } from './events.supabase';

// The seed derives every id from the fixture id.
setFixtureIds((table, id) => seedId(table, id));
// The database refuses to publish an image without alt text, so that scenario cannot be created.
setContractOptions({ publishedWithoutAlt: false });

let editor: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor', name: 'Contract Editor' });
  setContractEditor({ userId: editor.id, name: 'Contract Editor' });
});
afterAll(async () => {
  await editor.cleanup();
});

const NOW = new Date('2026-10-04T18:18:00+02:00');
const context = { locale: 'en' as const, now: NOW, justEndedDays: 14 };

describeEventsRepository('supabase', () => createSupabaseEventsRepository(editor.client(), 'session'));
describeEventTaxonomyRepository('supabase', () =>
  Promise.resolve({
    events: createSupabaseEventsRepository(editor.client(), 'session'),
    taxonomy: createSupabaseEventTaxonomyRepository(editor.client()),
  }),
);

describe('EventsRepository (supabase, visitor)', () => {
  it('lists published events only, and reaches a hidden one by its address', async () => {
    const repo = createSupabaseEventsRepository(anonClient(), 'public');
    const archive = await repo.archiveFacets({ now: NOW });
    expect(archive.counts.local + archive.counts.international).toBeGreaterThan(0);
    expect((await repo.listUpcoming(context)).every((event) => event.title.text !== '')).toBe(true);
    // A visitor cannot read the editor id (column grants).
    const denied = await anonClient().from('events').select('updated_by').limit(1);
    expect(denied.error?.code).toBe('42501');
  });

  it('resolves an address the visitor may see, and nothing else', async () => {
    const repo = createSupabaseEventsRepository(anonClient(), 'public');
    expect(await repo.resolveAddress('this-event-does-not-exist', NOW)).toBeNull();
    expect(await repo.findBySlug('this-event-does-not-exist', context)).toBeNull();
  });
});
