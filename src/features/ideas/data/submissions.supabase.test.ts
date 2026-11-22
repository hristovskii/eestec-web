import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedId } from '../../../../scripts/generate-seed';
import { anonClient, createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import type { FeedbackInput, IdeaInput } from '../types';
import type { SubmissionsRepository } from './submissions.repository';
import { describeSubmissionsRepository } from './submissions.repository.contract';
import { createSupabaseSubmissionsRepository } from './submissions.supabase';

type TestUser = Awaited<ReturnType<typeof createTestUser>>;
type Client = ReturnType<typeof anonClient>;

const NOW = new Date('2026-10-05T08:00:00.000Z');
const unique = () => crypto.randomUUID().slice(0, 8);
const PDF = new Uint8Array([37, 80, 68, 70, 45, 49]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]);

/** The seed derives every id from the fixture id; the prefix says which table it belongs to. */
const TABLES: Record<string, string> = { 'u-': 'auth.users', 'ev-': 'events', 'itype-': 'idea_types' };
const seeded = (id: string) => {
  const prefix = Object.keys(TABLES).find((candidate) => id.startsWith(candidate));
  return prefix ? seedId(TABLES[prefix]!, id) : id;
};

let editor: TestUser;
let manager: TestUser;
let member: TestUser;
const SOFT = seedId('events', 'ev-soft-skills-academy-2026');

beforeAll(async () => {
  editor = await createTestUser({ role: 'editor', name: 'Submissions Editor' });
  manager = await createTestUser({ role: 'event_manager', name: 'Submissions Manager' });
  member = await createTestUser({ member: 'active', name: 'Submissions Member' });
  const { error } = await serviceClient()
    .from('event_managers')
    .insert({ event_id: SOFT, user_id: manager.id });
  if (error) throw error;
});
afterAll(async () => {
  await serviceClient().from('event_managers').delete().eq('user_id', manager.id);
  await editor.cleanup();
  await manager.cleanup();
  await member.cleanup();
});

const repoFor = (client: Client) => createSupabaseSubmissionsRepository(client, 'session');
const server = () => createSupabaseSubmissionsRepository(serviceClient(), 'service');
const board = () => repoFor(editor.client());

// ─── The shared contract ───
// Submitting and storing files are the server's work (service role); everything else is the board's.

const SERVER = new Set(['storeFile', 'submitIdea', 'submitFeedback']);
function router(): SubmissionsRepository {
  type Method = (...args: unknown[]) => Promise<unknown>;
  return new Proxy({} as SubmissionsRepository, {
    // `await router()` looks for `then`: this is a repository, not a promise.
    get: (_target, name: string) =>
      name === 'then'
        ? undefined
        : (...args: unknown[]) =>
            ((SERVER.has(name) ? server() : board()) as unknown as Record<string, Method>)[name]!(...args),
  });
}

describeSubmissionsRepository('supabase', router, {
  ids: seeded,
  member: () => ({ userId: member.id, email: member.email }),
});

const idea = (patch: Partial<IdeaInput> = {}): IdeaInput => ({
  typeId: seeded('itype-workshop'),
  title: `Idea ${unique()}`,
  description: 'A description that is long enough to be a real idea.',
  locale: 'en',
  attachment: null,
  sender: { name: 'Bojan', email: 'bojan@example.org', userId: null, isAnonymous: false },
  ...patch,
});

const feedback = (patch: Partial<FeedbackInput> = {}): FeedbackInput => ({
  eventId: SOFT,
  otherEventName: '',
  eventTitle: 'Soft Skills',
  rating: 5,
  text: `Great ${unique()}`,
  locale: 'en',
  photos: [],
  memory: null,
  sender: { name: 'Bojan', email: 'bojan@example.org', userId: null, isAnonymous: false },
  ...patch,
});

describe('SubmissionsRepository (supabase, who may do what)', () => {
  it('lets only the server submit and store files', async () => {
    for (const who of [anonClient(), editor.client(), manager.client(), member.client()]) {
      const repo = repoFor(who);
      await expect(repo.submitIdea(idea(), NOW)).rejects.toMatchObject({ kind: 'forbidden' });
      await expect(repo.submitFeedback(feedback(), NOW)).rejects.toMatchObject({ kind: 'forbidden' });
      await expect(
        repo.storeFile({ bytes: PDF, mimeType: 'application/pdf', name: 'a.pdf' }),
      ).rejects.toBeTruthy();
    }
  });

  it('shows the board everything and an event manager only the rating and impression of their own events (D33)', async () => {
    const mine = await server().submitFeedback(
      feedback({
        sender: { name: 'Secret Sender', email: 'secret@example.org', userId: null, isAnonymous: false },
      }),
      NOW,
    );
    const photo = await server().storeFile({ bytes: JPEG, mimeType: 'image/jpeg', name: 'p.jpg' });
    const withPhoto = await server().submitFeedback(feedback({ photos: [photo] }), NOW);
    const theirs = repoFor(manager.client());

    const seen = await theirs.getFeedback(mine.id);
    expect(seen).toMatchObject({
      rating: 5,
      text: mine.text,
      eventId: SOFT,
      name: null,
      email: null,
      userId: null,
    });
    expect(JSON.stringify(seen)).not.toContain('Secret');
    expect((await theirs.getFeedback(withPhoto.id))?.photos).toEqual([]);
    expect(
      (await theirs.listFeedback({ onlyEventIds: [SOFT], page: 1, pageSize: 200 })).items.map(
        (row) => row.id,
      ),
    ).toContain(mine.id);
    expect((await theirs.feedbackCounts([SOFT])).all).toBeGreaterThan(0);
    // The board still sees the whole row.
    expect(await board().getFeedback(mine.id)).toMatchObject({
      name: 'Secret Sender',
      email: 'secret@example.org',
    });

    // Not their event, not their feedback; and never ideas, files or the full table.
    const elsewhere = await server().submitFeedback(
      feedback({ eventId: seedId('events', 'ev-power-up-2026') }),
      NOW,
    );
    expect(await theirs.getFeedback(elsewhere.id)).toBeNull();
    expect(
      (await theirs.listFeedback({ onlyEventIds: [SOFT], page: 1, pageSize: 200 })).items.map(
        (row) => row.id,
      ),
    ).not.toContain(elsewhere.id);
    expect((await theirs.listIdeas({ page: 1, pageSize: 10 })).total).toBe(0);
    expect(await theirs.readFile(photo.id)).toBeNull();
    expect((await theirs.listFeedback({ page: 1, pageSize: 10 })).total).toBe(0);
    expect(await theirs.ideaCounts()).toMatchObject({ all: 0 });
    const { error } = await manager.client().from('feedback').select('id').limit(1);
    expect(error).toBeNull();
  });

  it('lets the board read a private file and nobody else', async () => {
    const file = await server().storeFile({
      bytes: PDF,
      mimeType: 'application/pdf',
      name: 'secret plan.pdf',
    });
    await server().submitIdea(idea({ attachment: file }), NOW);
    expect(await board().readFile(file.id)).toEqual({
      bytes: PDF,
      mimeType: 'application/pdf',
      name: 'secret plan.pdf',
    });
    for (const who of [anonClient(), manager.client(), member.client()])
      expect(await repoFor(who).readFile(file.id)).toBeNull();
    expect((await anonClient().storage.from('submissions').download(file.id)).error).not.toBeNull();
    expect((await manager.client().storage.from('submissions').download(file.id)).error).not.toBeNull();
  });

  it('changes status and owner as the board only', async () => {
    const stored = await server().submitIdea(idea(), NOW);
    // The row is not theirs to see, so there is nothing to change.
    expect(await repoFor(manager.client()).updateIdea(stored.id, { status: 'archived' })).toBeNull();
    expect((await board().getIdea(stored.id))?.status).toBe('new');
    expect((await board().updateIdea(stored.id, { status: 'under_review' }))?.status).toBe('under_review');
    await expect(
      board().updateIdea(stored.id, { owner: { id: 'not-an-account', name: 'Nobody' } }),
    ).rejects.toMatchObject({ kind: 'invalid' });
  });
});

describe('SubmissionsRepository (supabase, what is stored)', () => {
  it('writes a verified member as themselves and refuses anyone else’s account', async () => {
    const ok = await server().submitIdea(
      idea({
        sender: { name: 'Member', email: member.email.toUpperCase(), userId: member.id, isAnonymous: false },
      }),
      NOW,
    );
    expect(ok.userId).toBe(member.id);
    await expect(
      server().submitIdea(
        idea({
          sender: {
            name: 'Member',
            email: 'someone-else@example.org',
            userId: member.id,
            isAnonymous: false,
          },
        }),
        NOW,
      ),
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('makes the Memory together with the feedback, waiting for the board, written by the member', async () => {
    const title = `From an impression ${unique()}`;
    const stored = await server().submitFeedback(
      feedback({
        sender: { name: 'Member', email: member.email, userId: member.id, isAnonymous: false },
        memory: {
          title,
          eventId: SOFT,
          otherEventName: '',
          city: 'Skopje',
          country: 'North Macedonia',
          happenedOn: null,
          body: '<p>It was good.</p>',
          cover: null,
          photos: [],
        },
      }),
      NOW,
    );
    expect(stored.memoryId).toEqual(expect.any(String));
    const { data } = await serviceClient()
      .from('memories')
      .select('status, source, author_id, slug, title')
      .eq('id', stored.memoryId!)
      .single();
    expect(data).toMatchObject({ status: 'pending', source: 'impression', author_id: member.id, title });
    expect(data?.slug).toBeTruthy();
  });

  it('refuses a Memory for anonymous feedback, and leaves nothing behind', async () => {
    const before = (await board().feedbackCounts()).all;
    await expect(
      server().submitFeedback(
        feedback({
          sender: { name: null, email: null, userId: null, isAnonymous: true },
          memory: {
            title: 'No Memory',
            eventId: SOFT,
            otherEventName: '',
            city: '',
            country: '',
            happenedOn: null,
            body: '<p>x</p>',
            cover: null,
            photos: [],
          },
        }),
        NOW,
      ),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    expect((await board().feedbackCounts()).all).toBe(before);
  });

  it('refuses a file that was never uploaded', async () => {
    const ghost = { id: crypto.randomUUID(), name: 'ghost.jpg', size: 10, mime: 'image/jpeg' };
    await expect(server().submitFeedback(feedback({ photos: [ghost] }), NOW)).rejects.toMatchObject({
      kind: 'invalid',
    });
    await expect(
      server().submitIdea(idea({ attachment: { ...ghost, mime: 'application/pdf' } }), NOW),
    ).rejects.toMatchObject({
      kind: 'invalid',
    });
  });

  it('numbers references per year of the app’s clock and keeps the app’s time', async () => {
    const stored = await server().submitIdea(idea(), new Date('2031-02-03T04:05:06.000Z'));
    expect(stored.createdAt).toBe('2031-02-03T04:05:06.000Z');
    const { data } = await serviceClient().from('ideas').select('reference').eq('id', stored.id).single();
    expect(data?.reference).toMatch(/^IDE-2031-/);
  });

  it('removes a file with the submission that owned it, and queues it for clean-up', async () => {
    const photo = await server().storeFile({ bytes: JPEG, mimeType: 'image/jpeg', name: 'gone.jpg' });
    const stored = await server().submitFeedback(feedback({ photos: [photo] }), NOW);
    await serviceClient().from('feedback').delete().eq('id', stored.id);
    const { data } = await serviceClient()
      .from('storage_cleanup_queue')
      .select('reason')
      .eq('bucket', 'submissions')
      .eq('path', photo.id);
    expect(data).toHaveLength(1);
  });
});
