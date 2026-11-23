import 'server-only';

import { selectImplementation } from '@/shared/data/select-implementation';
import { withClient } from '@/shared/data/supabase/clients';

import type { AuthRepository } from './auth.repository';
import { createMockAuthRepository } from './auth.mock';
import { createSupabaseAuthRepository } from './auth.supabase';
import { appFlowDeps } from './auth.supabase-session';

export const authRepository = () =>
  selectImplementation<AuthRepository>(
    'auth',
    {
      mock: createMockAuthRepository,
      supabase: withClient((client, scope) => createSupabaseAuthRepository(client, scope, appFlowDeps)),
    },
    'session',
  );
