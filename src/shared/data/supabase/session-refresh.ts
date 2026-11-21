import 'server-only';

import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

import { env } from '@/shared/config/env';

import type { Database } from './database.types';

const AUTH_COOKIE = /^sb-.+-auth-token/;

/**
 * Refreshes the Supabase session before the page renders (the proxy calls this): `getClaims()` verifies
 * the token and renews it when it is about to expire, and the new cookies go on the request (so the page
 * sees them) and the response. A no-op on mock data, without Supabase env, or for visitors without a
 * session cookie, so the empty-env build and anonymous traffic never wait on the network.
 */
export async function refreshSupabaseSession(request: NextRequest, response: NextResponse): Promise<void> {
  const url = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;
  if (env.DATA_SOURCE !== 'supabase' || !url || !anonKey) return;
  if (!request.cookies.getAll().some((cookie) => AUTH_COOKIE.test(cookie.name))) return;
  try {
    const client = createServerClient<Database>(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(items, headers) {
          for (const { name, value } of items) request.cookies.set(name, value);
          for (const { name, value, options } of items) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    });
    await client.auth.getClaims();
  } catch {
    // A failed refresh must not take the page down: the page treats the visitor as signed out.
  }
}
