import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DataError, unwrap } from '@/shared/data/supabase/errors';

import { anonClient, clientAs, createTestUser, serviceClient } from './harness';

/** The harness itself: PostgREST answers, the keys differ, and the minted JWTs reach the RLS helpers. */
describe('Supabase harness', () => {
  let editor: Awaited<ReturnType<typeof createTestUser>>;
  let superAdmin: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    editor = await createTestUser({ role: 'editor' });
    superAdmin = await createTestUser({ role: 'super_admin' });
  });
  afterAll(async () => {
    await editor.cleanup();
    await superAdmin.cleanup();
  });

  it('lets a visitor read listed events but not the editor id', async () => {
    const events = unwrap(await anonClient().from('events').select('slug').limit(3));
    expect(events.length).toBeGreaterThan(0);
    const denied = await anonClient().from('events').select('updated_by').limit(1);
    expect(denied.error?.code).toBe('42501');
  });

  it('keeps staff functions closed to visitors and open to staff', async () => {
    const visitor = await anonClient().rpc('dashboard_counts');
    expect(visitor.error?.code).toBe('42501');
    const counts = unwrap(await editor.client().rpc('dashboard_counts'));
    expect(counts).toHaveProperty('membershipApplications');
  });

  it('counts a super admin only with a 2-step session', async () => {
    const withoutSecondStep = await superAdmin.client('aal1').rpc('dashboard_counts');
    expect(withoutSecondStep.error?.code).toBe('42501');
    expect(unwrap(await superAdmin.client('aal2').rpc('dashboard_counts'))).toHaveProperty('messages');
  });

  it('gives the service role everything and a stranger nothing', async () => {
    const rows = unwrap(await serviceClient().from('admin_roles').select('user_id').eq('user_id', editor.id));
    expect(rows).toHaveLength(1);
    const stranger = clientAs({ id: '00000000-0000-0000-0000-000000000099' });
    const own = unwrap(await stranger.from('admin_roles').select('user_id'));
    expect(own).toHaveLength(0);
  });

  it('reports a database failure as a DataError', async () => {
    const failed = await anonClient().rpc('dashboard_counts');
    expect(() => unwrap(failed)).toThrow(DataError);
  });
});
