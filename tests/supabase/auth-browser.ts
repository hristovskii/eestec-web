import type { AuthMail, FlowDeps } from '@/features/auth/data/auth.supabase-flows';
import { createSupabaseAuthRepository } from '@/features/auth/data/auth.supabase';

import { anonClient, serviceClient } from './harness';

/**
 * One browser for the auth suites: a single Auth client that holds the session, the choices the app would have written
 * to cookies and the e-mails the flows made. Not imported by app code.
 */
export function authBrowser() {
  const client = anonClient();
  const choices: (boolean | null)[] = [];
  const mails: AuthMail[] = [];
  const deps: FlowDeps = {
    service: () => serviceClient(),
    signInClient: () => Promise.resolve(client),
    rememberChoice: (remember) => {
      choices.push(remember);
      return Promise.resolve();
    },
    mail: (mail) => {
      mails.push(mail);
      return Promise.resolve();
    },
  };
  return { client, choices, mails, repo: createSupabaseAuthRepository(client, 'session', deps) };
}

/** The token in the address of an e-mail's button. */
export const tokenOf = (mail: AuthMail | undefined): string => {
  const token = new URL(mail?.link ?? '', 'http://localhost').searchParams.get('token');
  if (!token) throw new Error('The e-mail has no link with a token');
  return token;
};
