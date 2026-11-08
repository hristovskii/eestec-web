import 'server-only';

import { cache } from 'react';

import { authRepository } from './data';
import { personas } from './data/fixtures/personas';
import { now } from '@/shared/lib/now';
import type { RegistrationStatus, TokenKind } from './types';

/** The current session, once per request. Reads cookies: call it inside <Suspense> (dynamic). */
export const getSession = cache(async () => (await authRepository()).getSession());

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

/** What a link in an e-mail points at, without using it (the reset page shows whose password it is). Dynamic. */
export async function peekToken(token: string, kind: TokenKind) {
  return (await authRepository()).peekToken({ token, kind, now: now() });
}

/** Confirmed registrations waiting for the board, and the oldest one's submit time (dashboard, sidebar). */
export async function getPendingRegistrationSummary() {
  return (await authRepository()).pendingRegistrationSummary();
}

/** Registrations for Approvals, oldest first. Callers check the permission. */
export async function listMemberRegistrations(status?: RegistrationStatus) {
  return (await authRepository()).listRegistrations(status ? { status } : {});
}

export async function getMemberRegistration(userId: string) {
  return (await authRepository()).getRegistration(userId);
}
