import 'server-only';

import { cookies } from 'next/headers';

import { REMEMBER_COOKIE, REMEMBER_MAX_AGE } from '@/shared/data/supabase/cookie-options';
import { serviceClient, sessionClient } from '@/shared/data/supabase/clients';

import type { SignInDeps } from './auth.supabase-sign-in';

/** The sign-in's wiring in the app: the service role, a cookie client that knows the choice, and the marker cookie. */
export const appSignInDeps: SignInDeps = {
  service: serviceClient,
  signInClient: (remember) => sessionClient(remember),
  async rememberChoice(remember) {
    const jar = await cookies();
    if (remember === null) jar.delete(REMEMBER_COOKIE);
    else
      jar.set(REMEMBER_COOKIE, remember ? '1' : '0', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
      });
  },
};
