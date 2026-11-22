import { createHmac, randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/data/supabase/database.types';

/**
 * Test support for the Supabase contract suites (`*.supabase.test.ts`). It talks to the local stack
 * through PostgREST like the app does, acting as a visitor, a signed-in person or the service role.
 * People are "signed in" with a JWT signed by the local secret (the same claims `pg_temp.act_as` sets in
 * pgTAP): the seeded accounts have no password, and real sign-in is M21. Not imported by app code.
 */
export type TestClient = SupabaseClient<Database>;

export function harnessEnv() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!url || !anonKey || !serviceKey || !jwtSecret) {
    throw new Error('Run the Supabase suites with `pnpm test:supabase` (it reads `supabase status`).');
  }
  return { url, anonKey, serviceKey, jwtSecret };
}

const stateless = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } as const;

export type Aal = 'aal1' | 'aal2';
export type Actor = { id: string; aal?: Aal };

const base64url = (value: Buffer | string) => Buffer.from(value).toString('base64url');

/** A short-lived HS256 token for `actor`, with the claims the RLS helpers read (`sub`, `role`, `aal`). */
export function mintJwt(actor: Actor): string {
  const { jwtSecret } = harnessEnv();
  const now = Math.floor(Date.now() / 1000);
  const head = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(
    JSON.stringify({
      aud: 'authenticated',
      role: 'authenticated',
      sub: actor.id,
      aal: actor.aal ?? 'aal1',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = createHmac('sha256', jwtSecret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${signature}`;
}

export const anonClient = (): TestClient => {
  const { url, anonKey } = harnessEnv();
  return createClient<Database>(url, anonKey, { auth: stateless });
};

export const serviceClient = (): TestClient => {
  const { url, serviceKey } = harnessEnv();
  return createClient<Database>(url, serviceKey, { auth: stateless });
};

/** A client acting as `actor` (RLS and the role helpers see their id and assurance level). */
export const clientAs = (actor: Actor): TestClient => {
  const { url, anonKey } = harnessEnv();
  return createClient<Database>(url, anonKey, {
    auth: stateless,
    global: { headers: { Authorization: `Bearer ${mintJwt(actor)}` } },
  });
};

export type TestRole = 'super_admin' | 'editor' | 'event_manager';
export type TestMemberStatus = 'pending' | 'active' | 'alumni';

/**
 * A fresh account for one suite: an Auth user (service role), and an admin role and/or a member
 * profile. `cleanup()` removes it again (the account's rows go with the user or are deleted here).
 */
export async function createTestUser(
  options: { role?: TestRole; member?: TestMemberStatus; name?: string; password?: string } = {},
) {
  const service = serviceClient();
  const tag = randomUUID().slice(0, 8);
  const email = `contract-${tag}@example.invalid`;
  const created = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    ...(options.password ? { password: options.password } : {}),
  });
  if (created.error || !created.data.user) throw created.error ?? new Error('Could not create a test user');
  const id = created.data.user.id;
  if (options.role) {
    const { error } = await service
      .from('admin_roles')
      .insert({ user_id: id, role: options.role, display_name: options.name ?? `Contract ${options.role}` });
    if (error) throw error;
  }
  if (options.member) {
    const { error } = await service.from('profiles').insert({
      id,
      username: `contract-${tag}`,
      full_name: options.name ?? `Contract ${options.member}`,
      status: options.member,
    });
    if (error) throw error;
  }
  return {
    id,
    email,
    client: (aal: Aal = 'aal1') => clientAs({ id, aal }),
    async cleanup() {
      await service
        .from('login_lockouts')
        .delete()
        .in('email_key', [email, `2fa:${id}`]);
      await service.from('admin_roles').delete().eq('user_id', id);
      await service.from('profiles').delete().eq('id', id);
      await service.auth.admin.deleteUser(id);
    },
  };
}
