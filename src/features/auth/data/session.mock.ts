import 'server-only';

import { cookies } from 'next/headers';

import type { SessionRepository } from './session.repository';
import { personas } from './fixtures/personas';

export const MOCK_PERSONA_COOKIE = 'eestec_mock_persona';

/** Mock session: a cookie names one of the sample personas. No cookie = visitor. */
export function createMockSessionRepository(): SessionRepository {
  return {
    async getSession() {
      const personaId = (await cookies()).get(MOCK_PERSONA_COOKIE)?.value;
      const persona = personas.find((p) => p.personaId === personaId);
      if (!persona) return null;
      const { personaId: _id, label: _label, ...session } = persona;
      return session;
    },
    async signOut() {
      (await cookies()).delete(MOCK_PERSONA_COOKIE);
    },
  };
}
