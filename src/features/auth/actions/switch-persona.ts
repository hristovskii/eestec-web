'use server';

import { cookies } from 'next/headers';

import { env } from '@/shared/config/env';
import { devSurfacesEnabled } from '@/shared/config/flags';

import { personas } from '../data/fixtures/personas';
import { MOCK_PERSONA_COOKIE } from '../data/session.mock';

/** Devtools only: sign in as a sample persona (or `null` for a visitor). Mock data only. */
export async function switchMockPersona(personaId: string | null): Promise<void> {
  if (!devSurfacesEnabled() || env.DATA_SOURCE !== 'mock') throw new Error('Persona switching is dev-only.');
  const jar = await cookies();
  if (personaId === null) {
    jar.delete(MOCK_PERSONA_COOKIE);
    return;
  }
  if (!personas.some((p) => p.personaId === personaId)) throw new Error(`Unknown persona: ${personaId}`);
  jar.set(MOCK_PERSONA_COOKIE, personaId, { httpOnly: true, sameSite: 'lax', path: '/' });
}
