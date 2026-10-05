import 'server-only';

import { cache } from 'react';

import { sessionRepository } from './data';
import { personas } from './data/fixtures/personas';

/** The current session, once per request. Reads cookies: call it inside <Suspense> (dynamic). */
export const getSession = cache(async () => (await sessionRepository()).getSession());

/** The persona of the current mock session (devtools). Reads cookies: dynamic. */
export async function getMockPersonaId(): Promise<string | null> {
  const session = await getSession();
  return personas.find((p) => p.userId === session?.userId)?.personaId ?? null;
}

/** Sample personas for the devtools switcher (mock data only). */
export function listMockPersonas() {
  return personas.map(({ personaId, label, name, adminRole, memberStatus }) => ({
    personaId,
    label,
    name,
    adminRole,
    memberStatus,
  }));
}
