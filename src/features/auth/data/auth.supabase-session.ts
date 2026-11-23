import 'server-only';

import { cookies } from 'next/headers';

import { REMEMBER_COOKIE, REMEMBER_MAX_AGE } from '@/shared/data/supabase/cookie-options';
import { serviceClient, sessionClient } from '@/shared/data/supabase/clients';

import { env } from '@/shared/config/env';

import type { FlowDeps } from './auth.supabase-flows';
import { sendMockMail } from './mailbox';

/** The sign-in's and the account flows' wiring in the app: the service role, a cookie client that knows the choice, and the marker cookie. */
export const appFlowDeps: FlowDeps = {
  // The e-mail service is M22. Until then the dev mailbox (`/api/dev-mailbox`) holds the e-mails the flows make, on a
  // developer's machine only; on any Vercel deployment nothing is sent, so a link cannot sit in an in-memory list.
  mail: (mail) => {
    if (!env.VERCEL_ENV) sendMockMail({ ...mail, reason: null });
    return Promise.resolve();
  },
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
