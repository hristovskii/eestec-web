import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import type { SessionRepository } from './session.repository';
import { createMockSessionRepository } from './session.mock';

export const sessionRepository = () =>
  selectImplementation<SessionRepository>('session', { mock: createMockSessionRepository }, 'session');
