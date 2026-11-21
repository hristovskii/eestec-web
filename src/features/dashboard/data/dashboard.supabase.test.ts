import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anonClient, createTestUser, serviceClient } from '../../../../tests/supabase/harness';
import { createSupabaseDashboardRepository } from './dashboard.supabase';
import { describeDashboardRepository } from './dashboard.repository.contract';

let editor: Awaited<ReturnType<typeof createTestUser>>;
let manager: Awaited<ReturnType<typeof createTestUser>>;
let member: Awaited<ReturnType<typeof createTestUser>>;
let waiting: Awaited<ReturnType<typeof createTestUser>>;
beforeAll(async () => {
  editor = await createTestUser({ role: 'editor' });
  manager = await createTestUser({ role: 'event_manager' });
  member = await createTestUser({ member: 'active' });
  // Confirmed their e-mail, waiting for the board.
  waiting = await createTestUser({ member: 'pending', name: 'Waiting Member' });
  const { error } = await serviceClient().from('member_accounts').insert({
    profile_id: waiting.id,
    faculty: 'FEEIT',
    year_of_study: '2',
    data_consent_at: new Date().toISOString(),
  });
  if (error) throw error;
});
afterAll(async () => {
  await serviceClient().from('member_accounts').delete().eq('profile_id', waiting.id);
  await editor.cleanup();
  await manager.cleanup();
  await member.cleanup();
  await waiting.cleanup();
});

describeDashboardRepository('supabase', () => createSupabaseDashboardRepository(editor.client()));

describe('DashboardRepository (supabase, who sees what)', () => {
  it('lists a confirmed registration with its faculty and year, and counts it', async () => {
    const data = await createSupabaseDashboardRepository(editor.client()).getDashboard({ own: false });
    expect(data.pending).toContainEqual(
      expect.objectContaining({
        id: waiting.id,
        type: 'member',
        title: 'Waiting Member',
        meta: 'FEEIT, 2nd year',
      }),
    );
    expect(data.counters.memberRegistrations.count).toBe(data.pending.length);
    const times = data.pending.map((item) => Date.parse(item.submittedAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(data.counters.memberRegistrations.oldestAt).toBe(data.pending[0]!.submittedAt);
  });

  it('shows an event manager no approvals, even when asked for the board’s view', async () => {
    const data = await createSupabaseDashboardRepository(manager.client()).getDashboard({ own: false });
    expect(data).toEqual({ counters: { memberRegistrations: { count: 0, oldestAt: null } }, pending: [] });
  });

  it('refuses a plain member and a visitor', async () => {
    await expect(
      createSupabaseDashboardRepository(member.client()).getDashboard({ own: false }),
    ).rejects.toMatchObject({
      kind: 'forbidden',
    });
    await expect(
      createSupabaseDashboardRepository(anonClient()).getDashboard({ own: false }),
    ).rejects.toMatchObject({
      kind: 'forbidden',
    });
  });
});
