import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';

import type { AuthRepository } from './auth.repository';
import { createMockAuthRepository } from './auth.mock';

export const authRepository = () =>
  selectImplementation<AuthRepository>('auth', { mock: createMockAuthRepository }, 'session');
