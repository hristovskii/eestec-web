import { afterAll, describe, expect, it } from 'vitest';

import { createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import { createSupabaseAccountDeletion } from './account-deletion.supabase';
import { createSupabaseMembersRepository } from './members.supabase';

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

const NOW = new Date('2026-10-05T08:00:00.000Z');
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const PDF = new Uint8Array([37, 80, 68, 70, 45, 49]);

const service = serviceClient();
const port = () => createSupabaseAccountDeletion(service, 'service');
const created: TestUser[] = [];
afterAll(async () => {
  for (const user of created) await user.cleanup();
});

/** A member with everything tied to the account: a photo, a CV, Memories, an idea and a piece of feedback. */
async function memberWithData() {
  const user = await createTestUser({ member: 'active', name: 'Deleting Member' });
  created.push(user);
  await service.from('member_accounts').insert({
    profile_id: user.id,
    faculty: 'FEEIT',
    year_of_study: '2',
    data_consent_at: NOW.toISOString(),
  });
  const repo = createSupabaseMembersRepository(user.client(), 'session');
  const who = {
    userId: user.id,
    name: 'Deleting Member',
    username: '',
    faculty: 'FEEIT',
    visibility: 'members_only' as const,
    photoUrl: null,
    since: '2026-10-05',
    pending: false,
  };
  await repo.savePhoto(who, { mimeType: 'image/jpeg', bytes: JPEG });
  await repo.setConsents(user.id, { cvOptIn: true }, NOW);
  await repo.storeCv(user.id, { fileName: 'cv.pdf', bytes: PDF }, NOW);

  const tag = crypto.randomUUID().slice(0, 8);
  const published = await service
    .from('memories')
    .insert({
      author_id: user.id,
      slug: `kept-${tag}`,
      status: 'published',
      title: 'Published',
      body: '<p>x</p>',
      published_at: NOW.toISOString(),
    })
    .select('id')
    .single();
  const draft = await service
    .from('memories')
    .insert({ author_id: user.id, status: 'draft', title: 'Draft' })
    .select('id')
    .single();
  const type = (await service.from('idea_types').select('id').limit(1).single()).data!;
  const idea = await service
    .from('ideas')
    .insert({
      reference: `IDE-del-${tag}`,
      type_id: type.id,
      title: 'An idea',
      description: 'Described',
      locale: 'en',
      name: 'Deleting Member',
      email: user.email,
      user_id: user.id,
      consent_at: NOW.toISOString(),
    })
    .select('id')
    .single();
  return {
    user,
    publishedId: published.data!.id,
    draftId: draft.data!.id,
    ideaId: idea.data!.id,
    slug: `kept-${tag}`,
  };
}

const folder = async (bucket: string, userId: string) =>
  (await service.storage.from(bucket).list(userId)).data ?? [];
const gone = async (userId: string) => (await service.auth.admin.getUserById(userId)).data.user === null;

describe('AccountDeletion (supabase)', () => {
  it('deletes the account and everything tied to it, and keeps published Memories as "a former member"', async () => {
    const made = await memberWithData();
    expect(await folder('avatars', made.user.id)).toHaveLength(1);
    expect(await folder('cvs', made.user.id)).toHaveLength(1);

    const result = await port().deleteAccount({
      userId: made.user.id,
      name: 'Deleting Member',
      email: made.user.email,
      locale: 'en',
      alsoDeleteMemories: false,
    });
    expect(result).toEqual({
      status: 'deleted',
      name: 'Deleting Member',
      email: made.user.email,
      locale: 'en',
    });

    expect(await gone(made.user.id)).toBe(true);
    expect((await service.from('profiles').select('id').eq('id', made.user.id)).data).toEqual([]);
    expect(
      (await service.from('member_accounts').select('profile_id').eq('profile_id', made.user.id)).data,
    ).toEqual([]);
    expect(await folder('avatars', made.user.id)).toHaveLength(0);
    expect(await folder('cvs', made.user.id)).toHaveLength(0);

    expect((await service.from('memories').select('id').eq('id', made.draftId)).data).toEqual([]);
    const kept = (
      await service.from('memories').select('author_id, author_deleted').eq('id', made.publishedId).single()
    ).data;
    expect(kept).toEqual({ author_id: null, author_deleted: true });
    const idea = (
      await service.from('ideas').select('name, email, user_id, consent_at').eq('id', made.ideaId).single()
    ).data;
    expect(idea).toEqual({ name: null, email: null, user_id: null, consent_at: null });

    const job = (
      await service
        .from('account_deletion_jobs')
        .select('completed_at, delete_published_memories')
        .eq('user_id', made.user.id)
        .single()
    ).data;
    expect(job?.completed_at).not.toBeNull();
    expect(job?.delete_published_memories).toBe(false);

    // Asking again changes nothing and still says it is done.
    expect(
      await port().deleteAccount({
        userId: made.user.id,
        name: 'Deleting Member',
        email: made.user.email,
        locale: 'en',
        alsoDeleteMemories: false,
      }),
    ).toMatchObject({ status: 'deleted' });
  });

  it('deletes the published Memories too when asked', async () => {
    const made = await memberWithData();
    await port().deleteAccount({
      userId: made.user.id,
      name: 'Deleting Member',
      email: made.user.email,
      locale: 'mk',
      alsoDeleteMemories: true,
    });
    expect((await service.from('memories').select('id').eq('id', made.publishedId)).data).toEqual([]);
    expect(await gone(made.user.id)).toBe(true);
  });

  it('finishes a deletion that was interrupted after the data was cleaned', async () => {
    const made = await memberWithData();
    // As if the server stopped right after the transaction: the rows are gone, the files and the account are not.
    unwrapOk(await service.rpc('begin_member_deletion', { p_user: made.user.id, p_delete_published: false }));
    expect(await folder('avatars', made.user.id)).toHaveLength(1);
    expect(await gone(made.user.id)).toBe(false);

    const result = await port().deleteAccount({
      userId: made.user.id,
      name: 'Deleting Member',
      email: made.user.email,
      locale: 'en',
      alsoDeleteMemories: false,
    });
    expect(result.status).toBe('deleted');
    expect(await folder('avatars', made.user.id)).toHaveLength(0);
    expect(await folder('cvs', made.user.id)).toHaveLength(0);
    expect(await gone(made.user.id)).toBe(true);
    expect(
      (
        await service
          .from('account_deletion_jobs')
          .select('completed_at')
          .eq('user_id', made.user.id)
          .single()
      ).data?.completed_at,
    ).not.toBeNull();
  });

  it('refuses a board account and keeps it', async () => {
    const board = await createTestUser({ role: 'editor', member: 'active', name: 'Board Person' });
    created.push(board);
    expect(
      await port().deleteAccount({
        userId: board.id,
        name: 'Board Person',
        email: board.email,
        locale: 'en',
        alsoDeleteMemories: true,
      }),
    ).toEqual({ status: 'staff' });
    expect(await gone(board.id)).toBe(false);
    expect((await service.from('profiles').select('id').eq('id', board.id)).data).toHaveLength(1);
  });

  it('says so when there is no such account', async () => {
    for (const userId of [crypto.randomUUID(), 'not-an-id'])
      expect(
        await port().deleteAccount({
          userId,
          name: 'Nobody',
          email: 'nobody@example.invalid',
          locale: 'en',
          alsoDeleteMemories: false,
        }),
      ).toEqual({ status: 'not_found' });
  });

  it('can be started by the server only', async () => {
    const made = await memberWithData();
    const asMember = createSupabaseAccountDeletion(made.user.client(), 'session');
    await expect(
      asMember.deleteAccount({
        userId: made.user.id,
        name: 'x',
        email: made.user.email,
        locale: 'en',
        alsoDeleteMemories: false,
      }),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    expect(await gone(made.user.id)).toBe(false);
  });
});

function unwrapOk(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}
