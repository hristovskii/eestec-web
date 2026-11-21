import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { env } from '@/shared/config/env';

import type { Database } from './database.types';
import type { RepoScope } from '../select-implementation';

export type DbClient = SupabaseClient<Database>;

/** The three values `DATA_SOURCE=supabase` requires (env.ts checks them when it is selected). */
function config() {
  const url = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) throw new Error('Supabase is not configured');
  return { url, anonKey, serviceKey };
}

const stateless = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } as const;

/** Anonymous and cookie-less: published content only, safe to cache. */
export function publicClient(): DbClient {
  const { url, anonKey } = config();
  return createClient<Database>(url, anonKey, { auth: stateless });
}

/** Bypasses RLS (D32). Server-only, never passed to client code, used after the caller's own checks. */
export function serviceClient(): DbClient {
  const { url, serviceKey } = config();
  return createClient<Database>(url, serviceKey, { auth: stateless });
}

/** The visitor's or admin's own session, read from the request cookies. */
export async function sessionClient(): Promise<DbClient> {
  const { url, anonKey } = config();
  const jar = await cookies();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(items) {
        try {
          for (const { name, value, options } of items) jar.set(name, value, options);
        } catch {
          // A Server Component cannot set cookies; the proxy already refreshed the session.
        }
      },
    },
  });
}

export async function clientForScope(scope: RepoScope): Promise<DbClient> {
  if (scope === 'service') return serviceClient();
  return scope === 'session' ? sessionClient() : publicClient();
}
