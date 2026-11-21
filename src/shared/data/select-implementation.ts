import 'server-only';

import { type DataSource } from '@/shared/config/data-source';
import { env } from '@/shared/config/env';

/**
 * 'public': cookie-less, cacheable reads of published content.
 * 'session': the visitor's or admin's session.
 * 'service': server-only, bypasses RLS (D32): the submit RPCs, the rate limit and account deletion, called
 * from Server Actions only after their spam, consent and session checks.
 */
export type RepoScope = 'public' | 'session' | 'service';

type Implementations<T> = { [K in DataSource]?: (scope: RepoScope) => T | Promise<T> } & {
  mock: (scope: RepoScope) => T | Promise<T>;
};

export class NotImplementedError extends Error {}

/**
 * The single data-layer switch (docs/ARCHITECTURE.md §4.3). Each feature registers its
 * implementations next to its repository interface; DATA_SOURCE picks one.
 */
export async function selectImplementation<T>(
  name: string,
  implementations: Implementations<T>,
  scope: RepoScope = 'public',
): Promise<T> {
  const implementation = implementations[env.DATA_SOURCE];
  if (!implementation) throw new NotImplementedError(`${name} has no "${env.DATA_SOURCE}" implementation`);
  return implementation(scope);
}
