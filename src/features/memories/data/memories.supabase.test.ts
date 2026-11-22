import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedId } from '../../../../scripts/generate-seed';
import { anonClient, createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import { NotImplementedError } from '@/shared/data/select-implementation';
import type { MemoryContent } from '../types';
import { describeMemoriesRepository } from './memories.repository.contract';
import type { MemoriesRepository } from './memories.repository';
import { createSupabaseMemoriesRepository } from './memories.supabase';

type TestUser = Awaited<ReturnType<typeof createTestUser>>;
type Client = ReturnType<typeof anonClient>;

const NOW = new Date('2026-10-10T10:00:00+02:00');
const unique = () => crypto.randomUUID().slice(0, 8);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]);

let editor: TestUser;
let manager: TestUser;
const authors = new Map<string, TestUser>();

beforeAll(async () => {
  editor = await createTestUser({ role: 'editor', name: 'Memories Editor' });
  manager = await createTestUser({ role: 'event_manager', name: 'Memories Manager' });
});
afterAll(async () => {
  for (const user of authors.values()) await user.cleanup();
  await editor.cleanup();
  await manager.cleanup();
});

const repoFor = (client: Client) => createSupabaseMemoriesRepository(client, 'session');
const visitor = () => repoFor(anonClient());
const staff = () => repoFor(editor.client());

async function newAuthor(): Promise<string> {
  const user = await createTestUser({ member: 'active', name: 'Memory Author' });
  authors.set(user.id, user);
  return user.id;
}
const asAuthor = (id: string) => repoFor(authors.get(id)!.client());

/** A photo the author uploaded: real Memories need real files (a placeholder is for sample Memories only). */
async function upload(userId: string) {
  return asAuthor(userId).storePhoto(userId, {
    mimeType: 'image/jpeg',
    width: 640,
    height: 480,
    bytes: JPEG,
  });
}

const content = async (userId: string, patch: Partial<MemoryContent> = {}): Promise<MemoryContent> => {
  const fileId = await upload(userId);
  return {
    title: `Story ${unique()}`,
    eventId: seedId('events', 'ev-power-up-2026'),
    otherEventName: '',
    city: 'Skopje',
    country: 'North Macedonia',
    happenedOn: '2026-05-20',
    body: '<p>One two three four five six seven eight nine ten.</p>',
    cover: { fileId, sample: null, alt: 'A cover', credit: 'Someone' },
    photos: [{ id: 'p1', fileId, sample: null, alt: 'First photo', caption: 'Caption' }],
    ...patch,
  };
};

async function publish(userId: string, patch: Partial<MemoryContent> = {}) {
  const body = await content(userId, patch);
  const author = asAuthor(userId);
  const saved = await author.saveDraft(userId, null, body, NOW);
  if (saved.status !== 'saved') throw new Error('expected saved');
  await author.submit(userId, saved.record.id, body, NOW);
  const approved = await staff().approve(saved.record.id, { reviewerName: 'x', now: NOW });
  if (approved.status !== 'approved') throw new Error('expected approved');
  return { id: saved.record.id, slug: approved.record.slug!, body };
}

// ─── The shared contract ───
// The contract speaks to one repository; a database needs the right person for each call. This one hands every call to
// the visitor, the author named in its first argument or the board, as the app does, and gives authors' placeholder
// photos real files (a placeholder is allowed in sample Memories only).

const PUBLIC = new Set([
  'list',
  'facets',
  'findPost',
  'listByEvent',
  'countByEvent',
  'listByAuthor',
  'countByAuthor',
  'latest',
  'listSlugs',
  'countRead',
]);
const AUTHOR = new Set([
  'storePhoto',
  'listMine',
  'countPublishedBy',
  'findMine',
  'findMinePost',
  'saveDraft',
  'submit',
  'createFromImpression',
  'discard',
  'retire',
]);
const CONTENT_ARGUMENT: Record<string, number> = { saveDraft: 2, submit: 2 };
const placeholderFiles = new Map<string, string>();

async function withFiles(userId: string, body: MemoryContent): Promise<MemoryContent> {
  const needsFile = (ref: { fileId: string | null } | null) => ref !== null && ref.fileId === null;
  if (!needsFile(body.cover) && !body.photos.some(needsFile)) return body;
  let fileId = placeholderFiles.get(userId);
  if (!fileId) {
    fileId = await upload(userId);
    placeholderFiles.set(userId, fileId);
  }
  const real = <T extends { fileId: string | null; sample: string | null }>(ref: T): T =>
    ref.fileId === null ? { ...ref, fileId, sample: null } : ref;
  return { ...body, cover: body.cover ? real(body.cover) : null, photos: body.photos.map(real) };
}

function router(): MemoriesRepository {
  type Method = (...args: unknown[]) => Promise<unknown>;
  return new Proxy({} as MemoriesRepository, {
    // `await router()` looks for `then`: this is a repository, not a promise.
    get: (_target, name: string) =>
      name === 'then'
        ? undefined
        : async (...args: unknown[]) => {
            const target = (PUBLIC.has(name)
              ? visitor()
              : AUTHOR.has(name)
                ? asAuthor(args[0] as string)
                : staff()) as unknown as Record<string, Method>;
            const at = CONTENT_ARGUMENT[name];
            if (at !== undefined) args[at] = await withFiles(args[0] as string, args[at] as MemoryContent);
            return target[name]!(...args);
          },
  });
}

describeMemoriesRepository('supabase', router, {
  ids: (id) => seedId('events', id),
  newAuthor,
  retire: false,
  impression: false,
});

// ─── What only a database can show ───

describe('MemoriesRepository (supabase, who may see what)', () => {
  it('keeps a draft and its photo from visitors and other members, and gives them to the author and the board', async () => {
    const userId = await newAuthor();
    const body = await content(userId, { title: 'Hidden draft' });
    const saved = await asAuthor(userId).saveDraft(userId, null, body, NOW);
    if (saved.status !== 'saved') throw new Error('expected saved');
    const fileId = body.cover!.fileId!;
    expect(await visitor().photoFile(fileId)).toBeNull();
    expect(await repoFor(manager.client()).photoFile(fileId)).toBeNull();
    expect(await asAuthor(userId).photoFile(fileId)).toEqual({ mimeType: 'image/jpeg', bytes: JPEG });
    expect(await staff().photoFile(fileId)).toEqual({ mimeType: 'image/jpeg', bytes: JPEG });
    const other = await newAuthor();
    expect(await asAuthor(other).photoFile(fileId)).toBeNull();
    expect(await asAuthor(other).findMine(other, { id: saved.record.id })).toBeNull();
    expect(await visitor().findPost(saved.record.slug ?? 'hidden-draft')).toBeNull();
  });

  it('hands out the photo of a published Memory to everyone, with the size the browser measured', async () => {
    const userId = await newAuthor();
    const { slug, body } = await publish(userId, { title: 'Public photo' });
    expect(await visitor().photoFile(body.cover!.fileId!)).toEqual({ mimeType: 'image/jpeg', bytes: JPEG });
    const post = await visitor().findPost(slug);
    expect(post?.cover).toMatchObject({
      fileId: body.cover!.fileId,
      width: 640,
      height: 480,
      alt: 'A cover',
    });
    expect(post?.photos[0]).toMatchObject({ width: 640, height: 480, caption: 'Caption' });
    // A made-up id or a path-like one is just "not there".
    expect(await visitor().photoFile(crypto.randomUUID())).toBeNull();
    expect(await visitor().photoFile('../etc/passwd')).toBeNull();
  });

  it('takes photos only into the member’s own folder and only from a member', async () => {
    const userId = await newAuthor();
    const other = await newAuthor();
    await expect(
      asAuthor(userId).storePhoto(other, { mimeType: 'image/jpeg', width: 1, height: 1, bytes: JPEG }),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(
      repoFor(manager.client()).storePhoto(manager.id, {
        mimeType: 'image/jpeg',
        width: 1,
        height: 1,
        bytes: JPEG,
      }),
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('refuses another author’s photo and edits to another author’s Memory', async () => {
    const userId = await newAuthor();
    const thief = await newAuthor();
    const mine = await content(userId);
    const saved = await asAuthor(userId).saveDraft(userId, null, mine, NOW);
    if (saved.status !== 'saved') throw new Error('expected saved');
    await expect(asAuthor(thief).saveDraft(thief, null, mine, NOW)).rejects.toMatchObject({
      kind: 'forbidden',
    });
    expect(await asAuthor(thief).submit(thief, saved.record.id, await content(thief), NOW)).toEqual({
      status: 'not_found',
    });
    expect(await asAuthor(thief).discard(thief, saved.record.id)).toBe(false);
    expect(await asAuthor(userId).discard(userId, saved.record.id)).toBe(true);
  });

  it('lets a visitor read published Memories only, never a revision or the reviewer', async () => {
    const userId = await newAuthor();
    const { id, slug } = await publish(userId, { title: 'Live and revised' });
    const edit = await content(userId, { title: 'Live and revised', body: '<p>New words that wait.</p>' });
    await asAuthor(userId).submit(userId, id, edit, NOW);
    const post = await visitor().findPost(slug);
    expect(post?.body).toContain('One two three');
    const { error } = await anonClient().from('memory_revisions').select('id').limit(1);
    expect(error).not.toBeNull();
    const { error: reviewer } = await anonClient().from('memories').select('reviewed_by').limit(1);
    expect(reviewer).not.toBeNull();
  });
});

describe('MemoriesRepository (supabase, reading)', () => {
  it('searches title, text without its tags, place and event name, and finds nothing for a tag name', async () => {
    const userId = await newAuthor();
    const tag = unique();
    await publish(userId, {
      title: `Findable ${tag}`,
      body: `<p>A <strong>distinctive${tag}</strong> word.</p>`,
      city: 'Ohrid',
      otherEventName: `Named ${tag}`,
      eventId: null,
    });
    const q = (text: string) =>
      visitor().list({
        q: text,
        eventId: null,
        year: null,
        place: null,
        authorId: userId,
        sort: 'newest',
        page: 1,
      });
    expect((await q(`distinctive${tag}`)).items).toHaveLength(1);
    expect((await q(`NAMED ${tag}`)).items).toHaveLength(1);
    expect((await q('ohrid')).items).toHaveLength(1);
    expect((await q('strong')).items).toHaveLength(0);
    expect((await q('100%_')).items).toHaveLength(0);
  });

  it('orders newest first, oldest first and the featured ones first, and clamps a page past the end', async () => {
    const userId = await newAuthor();
    const first = await publish(userId, { title: 'Older' });
    const second = await publish(userId, { title: 'Newer' });
    await staff().setFeatured(first.id, true);
    const base = { q: '', eventId: null, year: null, place: null, authorId: userId, page: 1 } as const;
    expect((await visitor().list({ ...base, sort: 'newest' })).items.map((item) => item.title)).toEqual([
      'Newer',
      'Older',
    ]);
    expect((await visitor().list({ ...base, sort: 'oldest' })).items.map((item) => item.title)).toEqual([
      'Older',
      'Newer',
    ]);
    const home = (await visitor().latest(500)).map((item) => item.id);
    expect(home.indexOf(first.id)).toBeLessThan(home.indexOf(second.id));
    const past = await visitor().list({ ...base, sort: 'newest', page: 99 });
    expect(past).toMatchObject({ page: 1, pageCount: 1, total: 2 });
    expect(past.items).toHaveLength(2);
  });

  it('counts and lists by event and author, leaving one out', async () => {
    const userId = await newAuthor();
    const event = seedId('events', 'ev-robomac-2026');
    const a = await publish(userId, { title: 'About the event A', eventId: event });
    await publish(userId, { title: 'About the event B', eventId: event });
    expect(await visitor().countByAuthor(userId)).toBe(2);
    expect((await visitor().listByAuthor(userId, { limit: 1 })).map((item) => item.title)).toEqual([
      'About the event B',
    ]);
    expect(
      (await visitor().listByEvent(event, { limit: 50, excludeId: a.id })).map((item) => item.id),
    ).not.toContain(a.id);
    expect(await visitor().countByEvent(event)).toBeGreaterThanOrEqual(2);
    expect(await visitor().countByEvent('not-an-id')).toBe(0);
    expect(await visitor().listByAuthor('not-an-id', { limit: 5 })).toEqual([]);
  });

  it('counts the facets and the numbers under the intro from published Memories', async () => {
    const userId = await newAuthor();
    const tag = unique();
    await publish(userId, {
      title: 'Facet',
      city: `City${tag}`,
      country: 'Land',
      happenedOn: '2019-03-03',
      eventId: null,
      otherEventName: `Gathering ${tag}`,
    });
    const facets = await visitor().facets();
    expect(facets.places).toContain(`City${tag}, Land`);
    expect(facets.years).toContain(2019);
    expect(facets.authors).toContainEqual({ authorId: userId, count: 1 });
    expect(facets.totals.stories).toBeGreaterThanOrEqual(1);
    expect(facets.totals.cities).toBeGreaterThanOrEqual(1);
  });

  it('does not count the author’s own reads', async () => {
    const userId = await newAuthor();
    const { slug } = await publish(userId, { title: 'Reads' });
    await asAuthor(userId).countRead(slug);
    await visitor().countRead(slug);
    expect((await visitor().findPost(slug))?.readsCount).toBe(1);
  });
});

describe('MemoriesRepository (supabase, the board)', () => {
  it('counts every status and the waiting changes, and finds Memories by title', async () => {
    const userId = await newAuthor();
    const tag = unique();
    const { id } = await publish(userId, { title: `Counted ${tag}` });
    await asAuthor(userId).submit(userId, id, await content(userId, { title: `Counted ${tag}` }), NOW);
    const list = await staff().adminList({ q: tag, status: 'published', page: 1, pageSize: 10 });
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({
      title: `Counted ${tag}`,
      status: 'published',
      revision: 'pending',
      authorId: userId,
    });
    expect(list.counts.revisions).toBeGreaterThanOrEqual(1);
    expect(list.counts.all).toBe(
      list.counts.draft + list.counts.pending + list.counts.published + list.counts.rejected,
    );
    expect((await staff().adminList({ q: '100%', status: 'all', page: 1, pageSize: 10 })).items).toHaveLength(
      0,
    );
  });

  it('edits a waiting revision in place, and does nothing when there is no revision (the mock does the same)', async () => {
    const userId = await newAuthor();
    const { id } = await publish(userId, { title: 'Revised by the board' });
    const edit = await content(userId, { title: 'Revised by the board' });
    expect(await staff().adminSave(id, edit, { featuredOnHome: false, revision: true }, NOW)).toBeNull();
    await asAuthor(userId).submit(userId, id, { ...edit, body: '<p>Waiting text.</p>' }, NOW);
    const saved = await staff().adminSave(
      id,
      { ...edit, body: '<p>Fixed by the board.</p>' },
      { featuredOnHome: true, revision: true },
      NOW,
    );
    expect(saved?.revision?.content.body).toContain('Fixed by the board');
    expect(saved?.content.body).toContain('One two three');
    expect(saved?.featuredOnHome).toBe(true);
  });

  it('shows the board who else was approved and what changed, and keeps managers out of the queue', async () => {
    const userId = await newAuthor();
    await publish(userId, { title: 'First approved' });
    const body = await content(userId, { title: 'Second waiting' });
    const saved = await asAuthor(userId).saveDraft(userId, null, body, NOW);
    if (saved.status !== 'saved') throw new Error('expected saved');
    await asAuthor(userId).submit(userId, saved.record.id, body, NOW);
    expect(await staff().review(saved.record.id)).toMatchObject({
      kind: 'memory',
      authorApproved: 1,
      changes: [],
    });
    expect(await staff().review(crypto.randomUUID())).toBeNull();
    expect(await repoFor(manager.client()).queue()).toEqual([]);
    await expect(
      repoFor(manager.client()).approve(saved.record.id, { reviewerName: 'x', now: NOW }),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    expect(await staff().approve('not-an-id', { reviewerName: 'x', now: NOW })).toEqual({
      status: 'not_found',
    });
  });

  it('removes a Memory and queues the photos nothing uses any more', async () => {
    const userId = await newAuthor();
    const { id, body } = await publish(userId, { title: 'To remove' });
    const fileId = body.cover!.fileId!;
    const path = (await serviceClient().from('media').select('path').eq('id', fileId).single()).data!.path!;
    expect(await staff().remove(id)).toBe(true);
    expect(await staff().remove(id)).toBe(false);
    const queued =
      (
        await serviceClient()
          .from('storage_cleanup_queue')
          .select('reason')
          .eq('bucket', 'memory-photos')
          .eq('path', path)
      ).data ?? [];
    expect(queued).toHaveLength(1);
  });

  it('leaves the impression form and the account deletion to the parts that own them', async () => {
    const userId = await newAuthor();
    await expect(
      asAuthor(userId).createFromImpression(userId, await content(userId), 'impression', NOW),
    ).rejects.toBeInstanceOf(NotImplementedError);
    await expect(asAuthor(userId).retire(userId, false)).rejects.toBeInstanceOf(NotImplementedError);
  });
});
